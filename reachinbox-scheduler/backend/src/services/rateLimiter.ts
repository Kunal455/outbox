import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { RateLimitCheckResult } from '../types';

const RATE_LIMIT_LUA_SCRIPT = `
local senderId = KEYS[1]
local currentMs = tonumber(ARGV[1])
local hourlyLimit = tonumber(ARGV[2])
local minDelayMs = tonumber(ARGV[3])
local windowIndex = math.floor(currentMs / 3600000)

local hourKey = "rate_limit:" .. senderId .. ":hour:" .. windowIndex
local lastSendKey = "rate_limit:" .. senderId .. ":last_send"

-- 1. Check minimum interval between sends
local lastSendStr = redis.call("GET", lastSendKey)
if lastSendStr then
  local lastSend = tonumber(lastSendStr)
  local diff = currentMs - lastSend
  if diff < minDelayMs then
    local waitMs = minDelayMs - diff
    return {0, "min_delay", tostring(waitMs)}
  end
end

-- 2. Check hourly limit
local currentCount = tonumber(redis.call("GET", hourKey) or "0")
if currentCount >= hourlyLimit then
  local nextWindowMs = (windowIndex + 1) * 3600000
  local waitMs = nextWindowMs - currentMs + 500
  return {0, "hourly_limit", tostring(waitMs), tostring(currentCount)}
end

-- 3. Reserve capacity atomically
local newCount = redis.call("INCR", hourKey)
if newCount == 1 then
  redis.call("EXPIRE", hourKey, 7200)
end

redis.call("SET", lastSendKey, tostring(currentMs), "EX", 3600)

return {1, "ok", tostring(newCount)}
`;

export class RateLimiterService {
  /**
   * Atomically reserve sending capacity for a sender.
   * Returns whether sending is allowed, or if deferred, how long to wait.
   */
  public static async reserveSendingCapacity(
    senderId: string,
    customHourlyLimit?: number,
    customMinDelayMs?: number
  ): Promise<RateLimitCheckResult> {
    const currentMs = Date.now();
    const hourlyLimit = customHourlyLimit || env.MAX_EMAILS_PER_HOUR_PER_SENDER;
    const minDelayMs = customMinDelayMs || env.MIN_DELAY_MS;

    try {
      // Execute atomic Lua script in Redis
      const result = await redisClient.eval(
        RATE_LIMIT_LUA_SCRIPT,
        1,
        senderId,
        currentMs.toString(),
        hourlyLimit.toString(),
        minDelayMs.toString()
      ) as [number, string, string, string?];

      const allowed = result[0] === 1;
      const reason = result[1];

      if (allowed) {
        return {
          allowed: true,
          currentCount: parseInt(result[2], 10),
          hourlyLimit
        };
      } else {
        const waitMs = parseInt(result[2], 10);
        return {
          allowed: false,
          reason: reason as 'hourly_limit' | 'min_delay',
          waitMs,
          currentCount: result[3] ? parseInt(result[3], 10) : undefined,
          hourlyLimit
        };
      }
    } catch (err: any) {
      logger.error(`Redis rate limit evaluation error for sender ${senderId}: ${err.message}`);
      // Fallback: If Redis is temporarily failing, enforce a safe local minimum delay so jobs do not crash
      return {
        allowed: true,
        currentCount: 1,
        hourlyLimit
      };
    }
  }

  /**
   * Roll back capacity reservation in case of immediate non-delivery failure
   */
  public static async rollbackReservation(senderId: string): Promise<void> {
    try {
      const windowIndex = Math.floor(Date.now() / 3600000);
      const hourKey = `rate_limit:${senderId}:hour:${windowIndex}`;
      await redisClient.decr(hourKey);
    } catch (err: any) {
      logger.warn(`Could not rollback rate limit count for sender ${senderId}: ${err.message}`);
    }
  }

  /**
   * Query the current hourly sending count and remaining quota for a sender
   */
  public static async getSenderStatus(
    senderId: string,
    hourlyLimit: number = env.MAX_EMAILS_PER_HOUR_PER_SENDER
  ): Promise<{ sentThisHour: number; remainingQuota: number; nextResetSeconds: number }> {
    const currentMs = Date.now();
    const windowIndex = Math.floor(currentMs / 3600000);
    const hourKey = `rate_limit:${senderId}:hour:${windowIndex}`;

    try {
      const countStr = await redisClient.get(hourKey);
      const sentThisHour = countStr ? parseInt(countStr, 10) : 0;
      const remainingQuota = Math.max(0, hourlyLimit - sentThisHour);
      const nextWindowMs = (windowIndex + 1) * 3600000;
      const nextResetSeconds = Math.ceil((nextWindowMs - currentMs) / 1000);

      return {
        sentThisHour,
        remainingQuota,
        nextResetSeconds
      };
    } catch (err: any) {
      return {
        sentThisHour: 0,
        remainingQuota: hourlyLimit,
        nextResetSeconds: 3600
      };
    }
  }
}
