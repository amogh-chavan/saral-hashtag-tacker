import { logger } from '../../services/logger';
import axios from 'axios';
import db from '../../db';
import { storageService } from '../../services/storage';
import { DownloadAssetPayload } from '../../services/queue';

export async function handleDownloadAsset(payload: DownloadAssetPayload) {
  const { internalMediaId, metaMediaUrl, fileExtension } = payload;
  
  logger.info(`[DOWNLOAD] Starting download for media ID: ${internalMediaId}`);

  try {
    // 0. Idempotency Check: Don't download if we already have it
    const existingMedia = await db('media').where({ id: internalMediaId }).first();
    if (existingMedia && existingMedia.asset_key) {
      logger.info(`[DOWNLOAD] Media ${internalMediaId} already has asset_key. Skipping redundant download.`);
      return;
    }

    // 1. Fetch the file from Meta as a stream
    const response = await axios.get(metaMediaUrl, { responseType: 'stream' });

    // 2. Generate S3 Key based on media type
    let subfolder = 'misc';
    const ext = fileExtension.toLowerCase();
    if (ext === '.mp4') {
      subfolder = 'videos';
    } else if (['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      subfolder = 'images';
    }
    
    const key = `${subfolder}/${internalMediaId}${fileExtension}`;

    // 3. Upload to S3 directly via stream (No memory bloat)
    const contentType = (response.headers['content-type'] as string) || 'application/octet-stream';
    await storageService.uploadStream(key, response.data, contentType);
    logger.info(`[DOWNLOAD] Uploaded to S3 with key: ${key}`);

    // 4. Update the Database with the permanent asset_key
    await db('media')
      .where({ id: internalMediaId })
      .update({ asset_key: key });
      
    logger.info(`[DOWNLOAD] Successfully updated DB for media ID: ${internalMediaId}`);
  } catch (error: any) {
    logger.error({ err: error.message }, `[DOWNLOAD] Error downloading asset for ${internalMediaId}:`);
    // Throw error so SQS knows the job failed and can retry it
    throw error;
  }
}
