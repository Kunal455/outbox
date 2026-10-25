import { Router } from 'express';
import { SearchController } from '../controllers/searchController';
import { requireAuth } from '../middleware/auth';

export const searchRoutes = Router();

searchRoutes.use(requireAuth);

searchRoutes.get('/emails', SearchController.searchEmails);
searchRoutes.post('/reindex', SearchController.reindex);
