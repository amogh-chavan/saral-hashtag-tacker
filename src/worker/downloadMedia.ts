import { logger } from '../services/logger';
import { DOWNLOAD_MEDIA_QUEUE_URL, JobType } from '../services/queue';
import { handleDownloadAsset } from './handlers/downloadMedia';
import { loadSecrets } from '../config/env';
import { config } from '../config/env';
import { pollQueue } from './poll';

async function processMessage(message: any) {
  if (!message.Body) return;
  const body = JSON.parse(message.Body);
  
  if (body.type === JobType.DOWNLOAD_ASSET) {
    await handleDownloadAsset(body.payload);
  } else {
    logger.warn(`[Download Worker] Unknown job type: ${body.type}`);
  }
}

async function startWorker() {
  try {
    logger.info('[Download Worker] Initializing...');
    await loadSecrets();
    logger.info(`[Download Worker] Successfully connected. Now polling queue: ${DOWNLOAD_MEDIA_QUEUE_URL}`);
    pollQueue('Download Worker', DOWNLOAD_MEDIA_QUEUE_URL, config.worker.downloadMedia.sqsPollBatchSize, processMessage);
  } catch (error) {
    logger.error(error, '[Download Worker] Fatal Error starting worker:');
    process.exit(1);
  }
}

startWorker();
