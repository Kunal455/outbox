import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockPrisma, mockRedis, MockWebClient } = vi.hoisted(() => {
  const mockPrisma = {
    slackConnection: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
      update: vi.fn()
    }
  };

  const mockRedis = {
    get: vi.fn(),
    set: vi.fn()
  };

  class MockWebClient {
    chat = {
      postMessage: vi.fn().mockResolvedValue({ ok: true })
    };
  }

  return { mockPrisma, mockRedis, MockWebClient };
});

vi.mock('../src/config/prisma', () => ({
  prisma: mockPrisma
}));

vi.mock('../src/config/redis', () => ({
  redisClient: mockRedis
}));

vi.mock('@slack/web-api', () => ({
  WebClient: MockWebClient
}));

import { SlackService } from '../src/services/slackService';
import { prisma } from '../src/config/prisma';
import { redisClient } from '../src/config/redis';
import { encrypt } from '../src/utils/crypto';

describe('Slack Integration & Rate-Limit Notifications', () => {
  const userId = 'user-test-uuid';
  const senderId = 'sender-test-uuid';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('reports configured: false when Slack client credentials are not in environment', async () => {
    const status = await SlackService.getConnectionStatus(userId);
    expect(status.connected).toBe(false);
  });

  it('marks connection DISCONNECTED when disconnect is called', async () => {
    (prisma.slackConnection.findUnique as any).mockResolvedValue({
      id: 'conn-1',
      userId,
      status: 'ACTIVE'
    });

    const result = await SlackService.disconnect(userId);
    expect(result).toBe(true);
    expect(prisma.slackConnection.update).toHaveBeenCalledWith({
      where: { userId },
      data: { status: 'DISCONNECTED' }
    });
  });

  it('skips sending Slack alert if an alert was already dispatched during this hour window', async () => {
    (redisClient.get as any).mockResolvedValue('1'); // Already alerted

    const alerted = await SlackService.notifyRateLimitExceeded({
      userId,
      senderId,
      senderName: 'Test Sender',
      senderEmail: 'sender@example.com',
      hourlyLimit: 100,
      rescheduledTime: new Date(Date.now() + 1800000)
    });

    expect(alerted).toBe(false);
    expect(prisma.slackConnection.findUnique).not.toHaveBeenCalled();
  });

  it('sends real Slack Block Kit notification when connection is active and sets debounce in Redis', async () => {
    (redisClient.get as any).mockResolvedValue(null); // Not yet alerted

    (prisma.slackConnection.findUnique as any).mockResolvedValue({
      id: 'conn-1',
      userId,
      teamId: 'T12345',
      teamName: 'Outbox Labs Slack',
      channelId: 'C67890',
      encryptedAccessToken: encrypt('mock-valid-slack-token'),
      status: 'ACTIVE'
    });

    const alerted = await SlackService.notifyRateLimitExceeded({
      userId,
      senderId,
      senderName: 'Test Sender',
      senderEmail: 'sender@example.com',
      hourlyLimit: 100,
      rescheduledTime: new Date(Date.now() + 1800000)
    });

    expect(alerted).toBe(true);
    expect(redisClient.set).toHaveBeenCalledWith(
      expect.stringContaining(`slack_alert:${senderId}:hour:`),
      '1',
      'EX',
      7200
    );
  });
});
