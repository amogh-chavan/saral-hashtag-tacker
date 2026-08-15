import { logger } from '../services/logger';
import db from '../db';
import { queueService, JobType } from '../services/queue';
import { loadSecrets } from '../config/env';

const POLL_INTERVAL_MS = 5000;

async function pollOutbox() {
  try {
    // 1. Fetch pending events
    const pendingEvents = await db('outbox_events')
      .where('status', 'PENDING')
      .orderBy('created_at', 'asc')
      .limit(50);

    for (const event of pendingEvents) {
      logger.info(`[Outbox Worker] Processing event ID: ${event.id}`);
      try {
        if (event.event_type === JobType.DOWNLOAD_ASSET) {
          const payload = typeof event.payload === 'string' ? JSON.parse(event.payload) : event.payload;
          await queueService.enqueueDownloadAsset(payload);
        } else {
          logger.warn(`[Outbox Worker] Unknown event type: ${event.event_type}`);
        }

        // Mark as processed
        await db('outbox_events')
          .where('id', event.id)
          .update({
            status: 'PROCESSED',
            processed_at: new Date()
          });
      } catch (err: any) {
        logger.error({ err: err.message }, `[Outbox Worker] Failed to process event ${event.id}:`);
      }
    }

    // 2. Delete processed events older than 1 day
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);
    
    await db('outbox_events')
      .where('status', 'PROCESSED')
      .andWhere('processed_at', '<', oneDayAgo)
      .delete();

  } catch (error: any) {
    logger.error({ err: error.message }, '[Outbox Worker] Error polling outbox:');
  } finally {
    setTimeout(pollOutbox, POLL_INTERVAL_MS);
  }
}

async function startWorker() {
  try {
    logger.info('[Outbox Worker] Initializing...');
    await loadSecrets();
    logger.info(`[Outbox Worker] Successfully connected. Now polling database outbox...`);
    pollOutbox();
  } catch (error) {
    logger.error(error, '[Outbox Worker] Fatal Error starting outbox worker:');
    process.exit(1);
  }
}

startWorker();
