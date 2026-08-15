import * as dotenv from 'dotenv';
import { fetchSecret } from '../services/secrets';
dotenv.config();

export const config = {
  nodeEnv: process.env.NODE_ENV || 'development',
  logLevel: process.env.LOG_LEVEL || 'info',
  port: parseInt(process.env.PORT as string, 10),
  db: {
    url: process.env.DATABASE_URL as string,
  },
  meta: {
    accessToken: process.env.META_ACCESS_TOKEN as string,
    userId: process.env.META_USER_ID as string,
    mediaFetchLimit: parseInt(process.env.META_MEDIA_FETCH_LIMIT as string, 10),
  },
  aws: {
    endpoint: process.env.AWS_ENDPOINT as string,
    publicEndpoint: process.env.AWS_PUBLIC_ENDPOINT as string,
    region: process.env.AWS_REGION as string,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
  sqs: {
    fetchMediaQueueUrl: process.env.SQS_FETCH_MEDIA_QUEUE_URL as string,
    downloadMediaQueueUrl: process.env.SQS_DOWNLOAD_MEDIA_QUEUE_URL as string,
  },
  s3: {
    bucketName: process.env.S3_BUCKET_NAME as string,
  },
  worker: {
    outbox: {
      batchSize: parseInt(process.env.WORKER_OUTBOX_BATCH_SIZE as string, 10),
    },
    fetchMedia: {
      sqsPollBatchSize: parseInt(process.env.WORKER_FETCH_MEDIA_SQS_POLL_BATCH_SIZE as string, 10),
    },
    downloadMedia: {
      sqsPollBatchSize: parseInt(process.env.WORKER_DOWNLOAD_MEDIA_SQS_POLL_BATCH_SIZE as string, 10),
    }
  }
};

/**
 * Call this dynamically at application startup to populate secrets from AWS Secrets Manager.
 */
export async function loadSecrets() {
  const secretId = process.env.AWS_SECRET_ID;
  if (secretId) {
    console.info(`[Config] Loading secrets from AWS Secrets Manager (${secretId})...`);
    const secrets = await fetchSecret(secretId);
    
    if (secrets) {
      config.db.url = secrets.DATABASE_URL || config.db.url;
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
