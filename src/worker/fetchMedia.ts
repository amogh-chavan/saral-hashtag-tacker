import { logger } from '../services/logger';
import { FETCH_MEDIA_QUEUE_URL, JobType } from '../services/queue';
import { handleSyncMedia } from './handlers/fetchMedia';
import { loadSecrets } from '../config/env';
import { pollQueue } from './poll';

async function processMessage(message: any) {
  if (!message.Body) return;
  const body = JSON.parse(message.Body);
  
  if (body.type === JobType.SYNC_TOP_HASHTAG_MEDIA || body.type === JobType.SYNC_RECENT_HASHTAG_MEDIA) {
    await handleSyncMedia(body.payload);
  } else {
    logger.warn(`[Sync Worker] Unknown job type: ${body.type}`);
  }
}

async function startWorker() {
  try {
    logger.info('[Sync Worker] Initializing...');
    await loadSecrets();
    logger.info(`[Sync Worker] Successfully connected. Now polling queue: ${FETCH_MEDIA_QUEUE_URL}`);
    pollQueue('Sync Worker', FETCH_MEDIA_QUEUE_URL, processMessage);
  } catch (error) {
    logger.error(error, '[Sync Worker] Fatal Error starting worker:');
    process.exit(1);
  }
}

startWorker();
