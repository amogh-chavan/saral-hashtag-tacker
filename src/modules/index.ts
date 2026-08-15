import { Router } from 'express';
import hashtagRouter from './hashtag';

const apiRouter = Router();

// Mount all module-specific routes here
apiRouter.use('/hashtags', hashtagRouter);

export default apiRouter;
