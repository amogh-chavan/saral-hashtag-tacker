import { logger } from '../../services/logger';
import db from '../../db';
import { metaService } from '../../services/meta';
import { queueService, SyncMediaPayload, JobType } from '../../services/queue';
import { FeedType } from '../../types';

export async function handleSyncMedia(payload: SyncMediaPayload) {
  const { hashtagId, igHashtagId, syncType, afterCursor } = payload;
  const totalFetched = payload.totalFetched || 0;
  const FETCH_LIMIT = 500;

  const feedType = syncType === JobType.SYNC_TOP_HASHTAG_MEDIA ? FeedType.TOP : FeedType.RECENT;

  logger.info(`[SYNC] Fetching ${feedType} for hashtag DB_ID: ${hashtagId} (after: ${afterCursor || 'none'})`);

  const response = await metaService.getHashtagMedia(igHashtagId, feedType, afterCursor);
  const mediaList = response.data;

  if (mediaList.length === 0) {
    logger.info(`[SYNC] No more media found for ${hashtagId}`);
    return;
  }

  await db.transaction(async (trx) => {
    for (const item of mediaList) {

      // 2. UPSERT Media (Cold Data)
      const mediaInsertResult = await trx('media')
        .insert({
          ig_media_id: item.id,
          media_type: item.media_type,
          caption: item.caption || null,
          permalink: item.permalink,
          posted_at: new Date() // Since Meta doesn't reliably return this, we default it
        })
        .onConflict('ig_media_id')
        .merge()
        .returning('id');

      const internalMediaId = mediaInsertResult[0].id;

      // 3. UPSERT Media Metrics (Hot Data)
      await trx('media_metrics')
        .insert({
          media_id: internalMediaId,
          like_count: item.like_count || 0,
          comments_count: item.comments_count || 0,
          last_synced_at: new Date()
        })
        .onConflict('media_id')
        .merge();

      // 4. Create Relation & Track Source (TOP/RECENT)
      const existingRelation = await trx('media_hashtags')
        .where({ media_id: internalMediaId, hashtag_id: hashtagId })
        .first();

      const sourceToAppend = syncType === JobType.SYNC_TOP_HASHTAG_MEDIA ? 'TOP' : 'RECENT';

      if (existingRelation) {
        // Only append if it isn't already there
        if (!existingRelation.sources.includes(sourceToAppend)) {
          await trx('media_hashtags')
            .where({ media_id: internalMediaId, hashtag_id: hashtagId })
            .update({
              sources: trx.raw('array_append(sources, ?)', [sourceToAppend])
            });
        }
      } else {
        await trx('media_hashtags').insert({
          media_id: internalMediaId,
          hashtag_id: hashtagId,
          sources: [sourceToAppend]
        });
      }

      // 5. Enqueue Asset Download (if not already downloaded)
      const currentMedia = await trx('media').where({ id: internalMediaId }).first();
      if (!currentMedia.asset_key && item.media_url) {
        const ext = item.media_type === 'VIDEO' ? '.mp4' : '.jpg';
        await queueService.enqueueDownloadAsset({
          internalMediaId: internalMediaId,
          metaMediaUrl: item.media_url,
          fileExtension: ext
        });
      }
    }
  });

  // 6. Handle Pagination
  const nextCursor = response.paging?.cursors?.after;
  const newlyFetchedTotal = totalFetched + mediaList.length;

  if (nextCursor && newlyFetchedTotal < FETCH_LIMIT) {
    logger.info(`[SYNC] Enqueuing next page for ${hashtagId}. Total fetched: ${newlyFetchedTotal}`);
    await queueService.enqueueSyncMedia({
      hashtagId,
      igHashtagId,
      syncType,
      afterCursor: nextCursor,
      totalFetched: newlyFetchedTotal,
    });
  } else {
    logger.info(`[SYNC] Finished syncing ${hashtagId}. Reached limit or end of cursor. Total: ${newlyFetchedTotal}`);
  }
}
