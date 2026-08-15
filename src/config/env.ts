import { logger } from '../services/logger';
import * as dotenv from 'dotenv';
import { fetchSecret } from '../services/secrets';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  db: {
    url: process.env.DATABASE_URL as string,
  },
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN as string,
    userId: process.env.META_USER_ID as string,
  },
  aws: {
    endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
    region: process.env.AWS_REGION || 'us-east-1',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
  },
  sqs: {
    fetchMediaQueueUrl: process.env.SQS_FETCH_MEDIA_QUEUE_URL || 'http://localhost:4566/000000000000/fetch-media-queue',
    downloadMediaQueueUrl: process.env.SQS_DOWNLOAD_MEDIA_QUEUE_URL || 'http://localhost:4566/000000000000/download-media-queue',
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME || 'ig-media',
  }
};

/**
 * Call this dynamically at application startup to populate secrets from AWS Secrets Manager.
 */
export async function loadSecrets() {
  const secretId = process.env.AWS_SECRET_ID;
  if (secretId) {
    logger.info(`[Config] Loading secrets from AWS Secrets Manager (${secretId})...`);
    const secrets = await fetchSecret(secretId);
    
    if (secrets) {
      config.db.url = secrets.DATABASE_URL || config.db.url;
      config.meta.accessToken = secrets.META_ACCESS_TOKEN || config.meta.accessToken;
      config.meta.userId = secrets.META_USER_ID || config.meta.userId;
    }
  }

  // Final Validation
  const missing = [];
  if (!config.db.url) missing.push('DATABASE_URL');
  if (!config.meta.accessToken) missing.push('META_ACCESS_TOKEN');
  if (!config.meta.userId) missing.push('META_USER_ID');

  if (missing.length > 0) {
    throw new Error(`Missing required configuration values: ${missing.join(', ')}. Ensure they are in .env or Secrets Manager.`);
  }
}
