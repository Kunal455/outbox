import { Router } from 'express';
import { AuthController } from '../controllers/authController';
import { requireAuth } from '../middleware/auth';

export const authRoutes = Router();

authRoutes.get('/me', requireAuth, AuthController.getMe);
authRoutes.post('/logout', AuthController.logout);
authRoutes.post('/dev-login', AuthController.devLogin);

// Google OAuth
authRoutes.get('/google', AuthController.googleAuth);
authRoutes.get('/google/callback', AuthController.googleCallback);

// Slack OAuth & Connection
authRoutes.get('/slack', AuthController.slackAuth);
authRoutes.get('/slack/callback', AuthController.slackCallback);
authRoutes.get('/slack/status', requireAuth, AuthController.getSlackStatus);
authRoutes.delete('/slack/disconnect', requireAuth, AuthController.disconnectSlack);
