import { Router } from 'express';
import { CampaignController } from '../controllers/campaignController';
import { requireAuth } from '../middleware/auth';

export const campaignRoutes = Router();

campaignRoutes.use(requireAuth);

campaignRoutes.get('/', CampaignController.listCampaigns);
campaignRoutes.post('/', CampaignController.createCampaign);
campaignRoutes.get('/:id', CampaignController.getCampaignById);
