import { Router } from 'express';
import multer from 'multer';
import { EmailController } from '../controllers/emailController';
import { requireAuth } from '../middleware/auth';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  }
});

export const emailRoutes = Router();

emailRoutes.use(requireAuth);

emailRoutes.post('/upload-csv', upload.single('file'), EmailController.uploadCsv);
emailRoutes.post('/schedule', upload.single('csvFile'), EmailController.scheduleEmails);
emailRoutes.get('/scheduled', EmailController.getScheduledEmails);
emailRoutes.get('/sent', EmailController.getSentEmails);
emailRoutes.get('/failed', EmailController.getFailedEmails);
emailRoutes.post('/reconcile', EmailController.reconcileOutbox);
emailRoutes.get('/:id', EmailController.getEmailById);
