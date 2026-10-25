import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiClient } from '../services/api';
import { emailService } from '../services/emailService';
import { senderService } from '../services/senderService';
import { dashboardService } from '../services/dashboardService';

vi.mock('../services/api', () => ({
  apiClient: {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn()
  }
}));

describe('Frontend API Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('emailService', () => {
    it('constructs correct parameters for getScheduledEmails', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          total: 10,
          page: 2,
          limit: 20,
          totalPages: 1,
          emails: []
        }
      });

      const res = await emailService.getScheduledEmails(2, 20);

      expect(apiClient.get).toHaveBeenCalledWith('/emails/scheduled?page=2&limit=20');
      expect(res.total).toBe(10);
    });

    it('submits scheduling payload correctly to /emails/schedule', async () => {
      vi.mocked(apiClient.post).mockResolvedValueOnce({
        data: {
          success: true,
          message: 'Scheduled 5 emails',
          campaign: { id: 'c-123', recipientCount: 5 }
        }
      });

      const payload = {
        senderId: 's-1',
        subject: 'Welcome',
        body: 'Hello',
        recipients: ['test@example.com'],
        startTime: '2026-10-25T10:00:00Z',
        delayBetweenSendsMs: 2000,
        hourlyLimit: 200
      };

      const res = await emailService.schedule(payload);

      expect(apiClient.post).toHaveBeenCalledWith('/emails/schedule', payload);
      expect(res.success).toBe(true);
    });
  });

  describe('senderService', () => {
    it('lists senders from /senders', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          success: true,
          senders: [{ id: 's-1', name: 'Primary', hourlyLimit: 100 }]
        }
      });

      const list = await senderService.listSenders();
      expect(apiClient.get).toHaveBeenCalledWith('/senders');
      expect(list).toHaveLength(1);
    });
  });

  describe('dashboardService', () => {
    it('fetches dashboard stats from /dashboard/stats', async () => {
      vi.mocked(apiClient.get).mockResolvedValueOnce({
        data: {
          metrics: { totalScheduled: 5, totalSent: 10 },
          queueMetrics: { waiting: 0, active: 1, delayed: 5 },
          systemHealth: { database: 'connected' },
          recentEmails: []
        }
      });

      const stats = await dashboardService.getStats();
      expect(apiClient.get).toHaveBeenCalledWith('/dashboard/stats');
      expect(stats.metrics.totalScheduled).toBe(5);
    });
  });
});
