import { describe, it, expect, beforeEach, vi } from 'vitest';

const { mockRedisClient } = vi.hoisted(() => ({
  mockRedisClient: {
    eval: vi.fn(),
    get: vi.fn(),
    set: vi.fn(),
    decr: vi.fn()
  }
}));

vi.mock('../src/config/redis', () => ({
  redisClient: mockRedisClient
}));

import { RateLimiterService } from '../src/services/rateLimiter';
import { redisClient } from '../src/config/redis';

describe('Distributed Atomic Rate Limiter Service', () => {
  const senderId = 'test-sender-uuid-001';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('permits sending when neither minimum interval nor hourly limit is reached', async () => {
    (redisClient.eval as any).mockResolvedValue([1, 'ok', '1']);

    const result = await RateLimiterService.reserveSendingCapacity(senderId, 200, 2000);

    expect(result.allowed).toBe(true);
    expect(result.currentCount).toBe(1);
    expect(result.hourlyLimit).toBe(200);
    expect(redisClient.eval).toHaveBeenCalledWith(
      expect.any(String),
      1,
      senderId,
      expect.any(String),
      '200',
      '2000'
    );
  });

  it('rejects and returns waitMs when minimum delay interval is not met', async () => {
    (redisClient.eval as any).mockResolvedValue([0, 'min_delay', '1250']);

    const result = await RateLimiterService.reserveSendingCapacity(senderId, 200, 2000);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('min_delay');
    expect(result.waitMs).toBe(1250);
  });

  it('rejects and defers to next window when hourly quota is exhausted', async () => {
    (redisClient.eval as any).mockResolvedValue([0, 'hourly_limit', '1800500', '200']);

    const result = await RateLimiterService.reserveSendingCapacity(senderId, 200, 2000);

    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hourly_limit');
    expect(result.waitMs).toBe(1800500);
    expect(result.currentCount).toBe(200);
  });

  it('rolls back capacity counter when an immediate send failure occurs', async () => {
    (redisClient.decr as any).mockResolvedValue(199);

    await RateLimiterService.rollbackReservation(senderId);

    expect(redisClient.decr).toHaveBeenCalledWith(expect.stringContaining(`rate_limit:${senderId}:hour:`));
  });

  it('queries current quota and remaining balance for a sender accurately', async () => {
    (redisClient.get as any).mockResolvedValue('45');

    const status = await RateLimiterService.getSenderStatus(senderId, 200);

    expect(status.sentThisHour).toBe(45);
    expect(status.remainingQuota).toBe(155);
    expect(status.nextResetSeconds).toBeGreaterThan(0);
    expect(status.nextResetSeconds).toBeLessThanOrEqual(3600);
  });
});
