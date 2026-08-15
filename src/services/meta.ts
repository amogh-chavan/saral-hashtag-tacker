import axios from 'axios';
import { config } from '../config/env';

export interface MetaMedia {
  id: string;
  media_type: 'IMAGE' | 'VIDEO' | 'CAROUSEL_ALBUM';
  caption?: string;
  permalink: string;
  media_url?: string;
  timestamp: string;
  like_count?: number;
  comments_count?: number;
}

export interface MetaResponse {
  data: MetaMedia[];
  paging?: {
    cursors?: {
      after?: string;
    };
    next?: string;
  };
}

export class MetaService {
  private accessToken: string;
  private userId: string;
  private baseUrl = 'https://graph.facebook.com/v24.0';

  constructor() {
    this.accessToken = config.meta.accessToken;
    this.userId = config.meta.userId;
  }

  /**
   * Fetches the internal Meta ID for a given hashtag string (e.g., "matcha").
   */
  async getHashtagId(hashtagName: string): Promise<string> {
    const url = `${this.baseUrl}/ig_hashtag_search`;
    
    const params = {
      user_id: this.userId,
      q: hashtagName,
      access_token: this.accessToken,
    };

    try {
      const response = await axios.get(url, { params });
      // The response structure is usually { data: [{ id: "123" }] }
      if (response.data?.data && response.data.data.length > 0) {
        return response.data.data[0].id;
      }
      throw new Error(`Hashtag '${hashtagName}' not found or inaccessible.`);
    } catch (error: any) {
      console.error(`Meta API Error fetching ID for hashtag ${hashtagName}:`, error?.response?.data || error.message);
      throw error;
    }
  }

  /**
   * Fetches the top or recent media for a given Instagram Hashtag ID.
   */
  async getHashtagMedia(
    hashtagId: string, 
    type: 'top_media' | 'recent_media', 
    afterCursor?: string
  ): Promise<MetaResponse> {
    const url = `${this.baseUrl}/${hashtagId}/${type}`;
    
    const params: Record<string, any> = {
      user_id: this.userId,
      fields: 'id,media_type,caption,permalink,media_url,timestamp,like_count,comments_count',
      limit: 50,
      access_token: this.accessToken,
    };

    if (afterCursor) {
      params.after = afterCursor;
    }

    try {
      const response = await axios.get<MetaResponse>(url, { params });
      return response.data;
    } catch (error: any) {
      console.error(`Meta API Error fetching ${type} for hashtag ${hashtagId}:`, error?.response?.data || error.message);
      throw error;
    }
  }
}

export const metaService = new MetaService();
