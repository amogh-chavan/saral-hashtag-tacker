import { hashtagModel } from './model';

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
    const [media, total] = await Promise.all([
      hashtagModel.getMediaByHashtagId(hashtag.id, limitNum, offset),
      hashtagModel.getMediaCountByHashtagId(hashtag.id)
    ]);
    
    const totalPages = Math.ceil(total / limitNum);

    // 4. Return formatted response
    return {
      data: media,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages,
      }
    };
  }
}

export const hashtagService = new HashtagService();
