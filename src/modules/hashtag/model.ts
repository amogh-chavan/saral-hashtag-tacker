import db from '../../db';

export class HashtagModel {
  async getTrackedHashtagByName(name: string) {
    return db('tracked_hashtags').where({ name }).first();
  }

  async getMediaByHashtagId(hashtagId: string, limit: number, offset: number) {
    return db('media')
      .join('media_hashtags', 'media.id', 'media_hashtags.media_id')
      .leftJoin('media_metrics', 'media.id', 'media_metrics.media_id')
      .where('media_hashtags.hashtag_id', hashtagId)
      .whereNotNull('media.asset_key')
      .select(
        'media.id',
        'media.media_type',
        'media.caption',
        'media.permalink',
        'media.asset_key',
        'media.posted_at',
        'media_metrics.like_count',
        'media_metrics.comments_count',
        'media_metrics.last_synced_at',
        'media_hashtags.sources'
      )
      .orderBy('media.posted_at', 'desc')
      .limit(limit)
      .offset(offset);
  }

  async getMediaCountByHashtagId(hashtagId: string): Promise<number> {
    const [{ count }] = await db('media')
      .join('media_hashtags', 'media.id', 'media_hashtags.media_id')
      .where('media_hashtags.hashtag_id', hashtagId)
      .whereNotNull('media.asset_key')
      .count();
    return parseInt(count as string, 10);
  }
}

export const hashtagModel = new HashtagModel();
