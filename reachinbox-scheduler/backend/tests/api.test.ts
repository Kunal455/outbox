import { describe, it, expect, beforeEach, vi } from 'vitest';
import request from 'supertest';

const { MockExpressAdapter, mockPrisma } = vi.hoisted(() => {
  class MockExpressAdapter {
    setBasePath = vi.fn();
    getRouter = vi.fn().mockReturnValue((req: any, res: any, next: any) => next());
  }

  const mockPrisma = {
    user: {
      findUnique: vi.fn(),
      upsert: vi.fn()
    },
    sender: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn()
    },
    campaign: {
      create: vi.fn(),
      findMany: vi.fn(),
      findFirst: vi.fn(),
      count: vi.fn()
    },
    emailRecord: {
      createMany: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      findFirst: vi.fn()
    },
    slackConnection: {
      findUnique: vi.fn()
    },
    $transaction: vi.fn()
  };

  return { MockExpressAdapter, mockPrisma };
});

vi.mock('@bull-board/api', () => ({
  createBullBoard: vi.fn()
}));
vi.mock('@bull-board/api/bullMQAdapter', () => ({
  BullMQAdapter: vi.fn()
}));
vi.mock('@bull-board/express', () => ({
  ExpressAdapter: MockExpressAdapter
}));

vi.mock('../src/config/prisma', () => ({
  prisma: mockPrisma
}));

vi.mock('../src/services/elasticsearchService', () => ({
  ElasticsearchService: {
    indexEmail: vi.fn().mockResolvedValue(true),
    updateEmailStatus: vi.fn().mockResolvedValue(true),
    searchEmails: vi.fn().mockResolvedValue({ total: 0, hits: [] }),
    reindexAll: vi.fn().mockResolvedValue({ indexedCount: 0, errors: 0 })
  }
}));

import { app } from '../src/app';
import { prisma } from '../src/config/prisma';
import { signAuthToken } from '../src/middleware/auth';
import * as queueModule from '../src/queues/emailQueue';

describe('API Endpoints, Authentication & Ownership Isolation', () => {
  const user1 = {
    userId: '11111111-1111-1111-1111-111111111111',
    email: 'user1@reachinbox.ai',
    name: 'User One'
  };
  const token1 = signAuthToken(user1);

  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(queueModule, 'enqueueEmailJob').mockResolvedValue('mock-job-id');
  });

  describe('GET /health', () => {
    it('returns 200 OK and health status', async () => {
      const res = await request(app).get('/health');
      expect(res.status).toBe(200);
      expect(res.body.status).toBe('ok');
    });
  });

  describe('Authentication Enforcement', () => {
    it('rejects unauthenticated requests to protected routes with 401', async () => {
      const res = await request(app).get('/api/senders');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(res.body.error).toContain('Authentication required');
    });

    it('rejects unauthenticated requests to /api/emails/scheduled with 401', async () => {
      const res = await request(app).get('/api/emails/scheduled');
      expect(res.status).toBe(401);
    });

    it('authenticates successfully via Bearer token', async () => {
      (prisma.sender.findMany as any).mockResolvedValue([]);

      const res = await request(app)
        .get('/api/senders')
        .set('Authorization', `Bearer ${token1}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });

  describe('POST /api/auth/dev-login', () => {
    it('provisions or returns demo user for local interview evaluation', async () => {
      (prisma.user.upsert as any).mockResolvedValue({
        id: user1.userId,
        email: user1.email,
        name: user1.name
      });
      (prisma.sender.findFirst as any).mockResolvedValue({ id: 'sender-1' });

      const res = await request(app)
        .post('/api/auth/dev-login')
        .send({ email: user1.email, name: user1.name });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.token).toBeDefined();
    });
  });

  describe('POST /api/emails/schedule Validation', () => {
    it('rejects schedule request when recipients list is empty', async () => {
      const res = await request(app)
        .post('/api/emails/schedule')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          senderId: '22222222-2222-2222-2222-222222222222',
          subject: 'Test Subject',
          body: 'Test Body',
          recipients: [],
          startTime: new Date(Date.now() + 60000).toISOString()
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('No valid recipients provided');
    });

    it('rejects schedule request with start time in the past', async () => {
      const pastTime = new Date(Date.now() - 3600000).toISOString();

      const res = await request(app)
        .post('/api/emails/schedule')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          senderId: '22222222-2222-2222-2222-222222222222',
          subject: 'Test Subject',
          body: 'Test Body',
          recipients: ['valid@example.com'],
          startTime: pastTime
        });

      expect(res.status).toBe(400);
      expect(res.body.error).toContain('Scheduled start time must be in the future');
    });

    it('rejects schedule request if sender does not belong to the authenticated user', async () => {
      (prisma.sender.findFirst as any).mockResolvedValue(null);

      const res = await request(app)
        .post('/api/emails/schedule')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          senderId: '33333333-3333-3333-3333-333333333333',
          subject: 'Test Subject',
          body: 'Test Body',
          recipients: ['valid@example.com'],
          startTime: new Date(Date.now() + 60000).toISOString()
        });

      expect(res.status).toBe(404);
      expect(res.body.error).toContain('Sender not found or not owned by user');
    });

    it('creates campaign, email records, and enqueues delayed jobs on valid request', async () => {
      const mockSender = {
        id: '44444444-4444-4444-4444-444444444444',
        userId: user1.userId,
        name: 'Primary Sender',
        email: 'sender@reachinbox.ai',
        isActive: true
      };
      const mockCampaign = {
        id: 'camp-created-1',
        userId: user1.userId,
        subject: 'Valid Campaign',
        body: 'Email Body',
        startTime: new Date(Date.now() + 60000)
      };
      const mockRecords = [
        {
          id: 'rec-1',
          campaignId: mockCampaign.id,
          senderId: mockSender.id,
          recipientEmail: 'client@example.com',
          subjectSnapshot: mockCampaign.subject,
          bodySnapshot: mockCampaign.body,
          scheduledTime: mockCampaign.startTime,
          idempotencyKey: 'idemp-1',
          createdAt: new Date()
        }
      ];

      (prisma.sender.findFirst as any).mockResolvedValue(mockSender);
      (prisma.$transaction as any).mockImplementation(async (callback: any) => {
        return callback({
          campaign: { create: vi.fn().mockResolvedValue(mockCampaign) },
          emailRecord: { createMany: vi.fn().mockResolvedValue({ count: 1 }) }
        });
      });
      (prisma.emailRecord.findMany as any).mockResolvedValue(mockRecords);

      const res = await request(app)
        .post('/api/emails/schedule')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          senderId: mockSender.id,
          subject: 'Valid Campaign',
          body: 'Email Body',
          recipients: ['client@example.com'],
          startTime: new Date(Date.now() + 60000).toISOString(),
          delayBetweenSendsMs: 2000,
          hourlyLimit: 150
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.campaign.recipientCount).toBe(1);
    });
  });
});
