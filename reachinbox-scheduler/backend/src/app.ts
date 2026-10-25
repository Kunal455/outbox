import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { createBullBoard } from '@bull-board/api';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';

import { env } from './config/env';
import { emailQueue } from './queues/emailQueue';
import { requireAuth } from './middleware/auth';
import { errorHandler } from './middleware/errorHandler';

import { authRoutes } from './routes/authRoutes';
import { senderRoutes } from './routes/senderRoutes';
import { emailRoutes } from './routes/emailRoutes';
import { campaignRoutes } from './routes/campaignRoutes';
import { searchRoutes } from './routes/searchRoutes';
import { dashboardRoutes } from './routes/dashboardRoutes';

export const app = express();

// Security HTTP headers
app.use(helmet({
  contentSecurityPolicy: false // Allow Bull Board inline scripts and styles
}));

// CORS Configuration
app.use(cors({
  origin: env.CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Body & Cookie Parsers
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(env.COOKIE_SECRET));

// Health Check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'reachinbox-scheduler-api',
    timestamp: new Date().toISOString()
  });
});

// BullMQ Monitoring Dashboard (Bull Board) mounted at /admin/queues
// Protected with authentication middleware
const bullBoardAdapter = new ExpressAdapter();
bullBoardAdapter.setBasePath('/admin/queues');

createBullBoard({
  queues: [new BullMQAdapter(emailQueue)],
  serverAdapter: bullBoardAdapter
});

app.use('/admin/queues', requireAuth, bullBoardAdapter.getRouter());

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/senders', senderRoutes);
app.use('/api/emails', emailRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Centralized error handler
app.use(errorHandler);
