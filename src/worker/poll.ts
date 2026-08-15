import { logger } from '../services/logger';
import { ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { sqsClient } from '../services/queue';

const POLL_INTERVAL_MS = 2000;

export async function pollQueue(
  workerName: string,
  queueUrl: string,
  processMessage: (message: any) => Promise<void>
) {
  try {
    const command = new ReceiveMessageCommand({
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 5,
      WaitTimeSeconds: 10,
    });

    const response = await sqsClient.send(command);

    if (response.Messages && response.Messages.length > 0) {
      for (const message of response.Messages) {
        logger.info(`[${workerName}] Processing message ID: ${message.MessageId}`);
        try {
          await processMessage(message);
          
          const deleteCommand = new DeleteMessageCommand({
            QueueUrl: queueUrl,
            ReceiptHandle: message.ReceiptHandle,
          });
          await sqsClient.send(deleteCommand);
          logger.info(`[${workerName}] Successfully finished & deleted message ID: ${message.MessageId}`);
        } catch (err: any) {
          logger.error({ err: err.message }, `[${workerName}] Job Failed for message ${message.MessageId}:`);
        }
      }
    }
  } catch (error: any) {
    logger.error({ err: error.message }, `[${workerName}] Error polling SQS:`);
  } finally {
    setTimeout(() => pollQueue(workerName, queueUrl, processMessage), POLL_INTERVAL_MS);
  }
}
