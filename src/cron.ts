import { logger } from './services/logger';
import cron from 'node-cron';
import db from './db';
import { queueService, JobType } from './services/queue';
import { loadSecrets } from './config/env';

async function enqueueSyncJobs(syncType: JobType.SYNC_TOP_HASHTAG_MEDIA | JobType.SYNC_RECENT_HASHTAG_MEDIA) {
  logger.info(`[Cron] Enqueuing ${syncType} sync jobs...`);
  try {
    const activeHashtags = await db('tracked_hashtags').where({ is_active: true });
    
    if (activeHashtags.length === 0) {
      logger.info('[Cron] No active hashtags found. Nothing to sync.');
      return;
    }

    for (const hashtag of activeHashtags) {
      await queueService.enqueueSyncMedia({
        hashtagId: hashtag.id,
        igHashtagId: hashtag.ig_hashtag_id,
        syncType: syncType,
      });

      logger.info(`[Cron] Enqueued ${syncType} job for #${hashtag.name}`);
    }
  } catch (error) {
    logger.error(error, `[Cron] Error enqueuing ${syncType} jobs:`);
  }
}

async function startCron() {
  await loadSecrets();
  
  logger.info('[Cron] Scheduler initialized. Top Media: every 12 hours. Recent Media: every 2 hours.');

  // For convenience, run immediately on startup
  await enqueueSyncJobs(JobType.SYNC_TOP_HASHTAG_MEDIA);
  await enqueueSyncJobs(JobType.SYNC_RECENT_HASHTAG_MEDIA);

  // Top Media doesn't change rapidly. Run every 12 hours.
  cron.schedule('0 */12 * * *', async () => {
    await enqueueSyncJobs(JobType.SYNC_TOP_HASHTAG_MEDIA);
  });

  // Recent Media changes constantly. Run every 3 hours.
  cron.schedule('0 */3 * * *', async () => {
    await enqueueSyncJobs(JobType.SYNC_RECENT_HASHTAG_MEDIA);
  });
}

startCron();
