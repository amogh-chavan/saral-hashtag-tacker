import { S3Client } from '@aws-sdk/client-s3';
import { Upload } from '@aws-sdk/lib-storage';
import stream from 'stream';
import { config } from '../config/env';

export const s3Client = new S3Client({
  endpoint: config.aws.endpoint,
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
  forcePathStyle: true, // Needed for LocalStack
});

export const BUCKET_NAME = config.s3.bucketName;

export class StorageService {
  /**
   * Uploads a readable stream to S3 and returns the asset key.
   */
  async uploadStream(key: string, bodyStream: stream.Readable, contentType: string): Promise<string> {
    const upload = new Upload({
      client: s3Client,
      params: {
        Bucket: BUCKET_NAME,
        Key: key,
        Body: bodyStream,
        ContentType: contentType,
      },
    });

    await upload.done();
    return key;
  }
}

export const storageService = new StorageService();
