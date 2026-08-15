import { logger } from '../services/logger';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient, QUEUE_URL, JobType } from '../services/queue';
import { handleSyncMedia } from './handlers/syncMedia';
import { handleDownloadAsset } from './handlers/downloadAsset';
import { loadSecrets } from '../config/env';

const POLL_INTERVAL_MS = 2000;

async function processMessage(message: any) {
  if (!message.Body) return;
  
  const body = JSON.parse(message.Body);
  
  switch (body.type) {
    case JobType.SYNC_TOP_HASHTAG_MEDIA:
    case JobType.SYNC_RECENT_HASHTAG_MEDIA:
      await handleSyncMedia(body.payload);
      break;
    case JobType.DOWNLOAD_ASSET:
      await handleDownloadAsset(body.payload);
      break;
    default:
      logger.warn(`[Worker] Unknown job type: ${body.type}`);
  }
}

async function pollQueue() {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: QUEUE_URL,
      MaxNumberOfMessages: 5, // Process up to 5 at a time
      WaitTimeSeconds: 10,    // Enable long polling to save API calls
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        logger.info(`[Worker] Processing message ID: ${message.MessageId}`);
        
        try {
          // 1. Process the job
          await processMessage(message);
          
          // 2. Delete the message on success
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: QUEUE_URL,
            ReceiptHandle: message.ReceiptHandle,
          });
          await sqsClient.send(deleteCommand);
          logger.info(`[Worker] Successfully finished & deleted message ID: ${message.MessageId}`);
        } catch (err: any) {
          logger.error({ err: err.message }, `[Worker] Job Failed for message ${message.MessageId}:`);
          // If a job fails, we DO NOT delete the message. 
          // SQS will automatically retry it when the visibility timeout expires.
        }
      }
    }
  } catch (error: any) {
    logger.error({ err: error.message }, '[Worker] Error polling SQS:');
  } finally {
    // Continue polling loop
    setTimeout(pollQueue, POLL_INTERVAL_MS);
  }
}

async function startWorker() {
  try {
    logger.info('[Worker] Initializing...');
    await loadSecrets();
    
    logger.info(`[Worker] Successfully connected. Now polling queue: ${QUEUE_URL}`);
    pollQueue();
  } catch (error) {
    logger.error(error, '[Worker] Fatal Error starting worker:');
    process.exit(1);
  }
}

startWorker();
