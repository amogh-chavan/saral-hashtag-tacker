import { Router } from 'express';
import { hashtagController } from './controller';
import { hashtagValidator } from './validator';

const hashtagRouter = Router();

hashtagRouter.get('/', hashtagValidator.getHashtagMedia, hashtagController.getHashtagMedia);

export default hashtagRouter;
