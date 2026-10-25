import { Router } from 'express';
import { SenderController } from '../controllers/senderController';
import { requireAuth } from '../middleware/auth';

export const senderRoutes = Router();

senderRoutes.use(requireAuth);

senderRoutes.get('/', SenderController.listSenders);
senderRoutes.post('/', SenderController.createSender);
senderRoutes.patch('/:id', SenderController.updateSender);
