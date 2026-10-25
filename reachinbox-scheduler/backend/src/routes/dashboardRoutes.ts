import { Router } from 'express';
import { DashboardController } from '../controllers/dashboardController';
import { requireAuth } from '../middleware/auth';

export const dashboardRoutes = Router();

dashboardRoutes.use(requireAuth);

dashboardRoutes.get('/stats', DashboardController.getStats);
