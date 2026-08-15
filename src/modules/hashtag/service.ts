import { hashtagModel } from './model';
import { config } from '../../config/env';

export class HashtagService {
  async getPaginatedMedia(name: string, pageNum: number, limitNum: number) {
    // 1. Validate if hashtag is tracked
    const hashtag = await hashtagModel.getTrackedHashtagByName(name);
    
    if (!hashtag) {
      return null; // Signals to controller that it's a 404
    }

    // 2. Calculate pagination
    const offset = (pageNum - 1) * limitNum;
    
    // 3. Fetch data from models
    let media;
    let total: number | undefined;

    if (pageNum === 1) {
      [media, total] = await Promise.all([
        hashtagModel.getMediaByHashtagId(hashtag.id, limitNum, offset),
        hashtagModel.getMediaCountByHashtagId(hashtag.id)
      ]);
    } else {
      media = await hashtagModel.getMediaByHashtagId(hashtag.id, limitNum, offset);
    }
    
    const totalPages = total !== undefined ? Math.ceil(total / limitNum) : undefined;

    const formattedMedia = media.map(m => ({
      ...m,
      asset_key: `${config.aws.publicEndpoint}/${config.s3.bucketName}/${m.asset_key}`
    }));

    // 4. Return formatted response
    return {
      data: formattedMedia,
      meta: {
        ...(total !== undefined && { total, totalPages }),
        page: pageNum,
        limit: limitNum,
      }
    };
  }
}

export const hashtagService = new HashtagService();
