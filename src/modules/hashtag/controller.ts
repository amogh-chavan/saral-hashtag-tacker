import { Request, Response } from 'express';
import { hashtagService } from './service';

export class HashtagController {
  getHashtagMedia = async (req: Request, res: Response) => {
    try {
      // The Joi validator has already validated and casted these to the correct types!
      const { name, page, limit } = req.query as unknown as { name: string; page: number; limit: number };
      
      // 1. Delegate to Service
      const result = await hashtagService.getPaginatedMedia(name, page, limit);
      
      // 3. Handle specific service outcomes
      if (!result) {
        return res.status(404).json({ error: "Hashtag not found or not currently tracked." });
      }

      // 4. Send success response
      return res.json(result);
    } catch (error) {
      console.error('[HashtagController] Error fetching hashtag media:', error);
      res.status(500).json({ error: "Internal Server Error" });
    }
  }
}

export const hashtagController = new HashtagController();
