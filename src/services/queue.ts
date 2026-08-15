import { logger } from './logger';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { config } from '../config/env';
import { FeedType } from '../types';

export const sqsClient = new SQSClient({
  endpoint: config.aws.endpoint,
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

export const QUEUE_URL = config.sqs.queueUrl;

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
    await this.sendMessage({
      type: payload.syncType,
      payload,
    });
  }

  async enqueueDownloadAsset(payload: DownloadAssetPayload) {
    await this.sendMessage({
      type: JobType.DOWNLOAD_ASSET,
      payload,
    });
  }

  private async sendMessage(body: { type: JobType; payload: any }) {
    const command = new SendMessageCommand({
      QueueUrl: QUEUE_URL,
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
