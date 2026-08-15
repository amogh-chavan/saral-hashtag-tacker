import { logger } from './logger';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config/env';


export const sqsClient = new SQSClient({
  endpoint: config.aws.endpoint,
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export const FETCH_MEDIA_QUEUE_URL = config.sqs.fetchMediaQueueUrl;
export const DOWNLOAD_MEDIA_QUEUE_URL = config.sqs.downloadMediaQueueUrl;

export enum JobType {
  SYNC_TOP_HASHTAG_MEDIA = 'SYNC_TOP_HASHTAG_MEDIA',
  SYNC_RECENT_HASHTAG_MEDIA = 'SYNC_RECENT_HASHTAG_MEDIA',
  DOWNLOAD_ASSET = 'DOWNLOAD_ASSET',
}

export interface SyncMediaPayload {
  hashtagId: string; // The UUID in our DB
  igHashtagId: string; // The Meta API ID
  syncType: JobType.SYNC_TOP_HASHTAG_MEDIA | JobType.SYNC_RECENT_HASHTAG_MEDIA;
  afterCursor?: string;
  totalFetched?: number; // Used to track when we hit our 500 limit
}

export interface DownloadAssetPayload {
  internalMediaId: string; // UUID in our DB
  metaMediaUrl: string; // The expiring Meta URL
  fileExtension: string; // e.g. .jpg or .mp4
}

export class QueueService {
  async enqueueSyncMedia(payload: SyncMediaPayload) {
    await this.sendMessage(FETCH_MEDIA_QUEUE_URL, {
      type: payload.syncType,
      payload,
    });
  }

  async enqueueDownloadAsset(payload: DownloadAssetPayload) {
    await this.sendMessage(DOWNLOAD_MEDIA_QUEUE_URL, {
      type: JobType.DOWNLOAD_ASSET,
      payload,
    });
  }

  private async sendMessage(queueUrl: string, body: { type: JobType; payload: any }) {
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(body),
    });

    try {
      await sqsClient.send(command);
    } catch (error) {
      logger.error(error, `Failed to enqueue job ${body.type}:`);
      throw error;
    }
  }
}

export const queueService = new QueueService();
