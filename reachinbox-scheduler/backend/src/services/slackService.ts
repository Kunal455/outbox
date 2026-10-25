import { WebClient } from '@slack/web-api';
import { prisma } from '../config/prisma';
import { redisClient } from '../config/redis';
import { env } from '../config/env';
import { decrypt, encrypt } from '../utils/crypto';
import { logger } from '../utils/logger';

export class SlackService {
  /**
   * Check if Slack OAuth integration is configured in environment
   */
  public static isConfigured(): boolean {
    return Boolean(env.SLACK_CLIENT_ID && env.SLACK_CLIENT_SECRET);
  }

  /**
   * Store or update Slack connection for a user
   */
  public static async saveConnection(params: {
    userId: string;
    teamId: string;
    teamName: string;
    channelId?: string;
    channelName?: string;
    accessToken: string;
  }): Promise<void> {
    const encryptedToken = encrypt(params.accessToken);

    await prisma.slackConnection.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        teamId: params.teamId,
        teamName: params.teamName,
        channelId: params.channelId || null,
        channelName: params.channelName || null,
        encryptedAccessToken: encryptedToken,
        status: 'ACTIVE'
      },
      update: {
        teamId: params.teamId,
        teamName: params.teamName,
        channelId: params.channelId || null,
        channelName: params.channelName || null,
        encryptedAccessToken: encryptedToken,
        status: 'ACTIVE',
        updatedAt: new Date()
      }
    });

    logger.info(`Slack connection successfully saved for user ${params.userId} (Team: ${params.teamName})`);
  }

  /**
   * Disconnect Slack integration for a user
   */
  public static async disconnect(userId: string): Promise<boolean> {
    const connection = await prisma.slackConnection.findUnique({
      where: { userId }
    });

    if (!connection) {
      return false;
    }

    await prisma.slackConnection.update({
      where: { userId },
      data: { status: 'DISCONNECTED' }
    });

    logger.info(`Slack connection marked DISCONNECTED for user ${userId}`);
    return true;
  }

  /**
   * Get active connection status for a user
   */
  public static async getConnectionStatus(userId: string): Promise<{
    configured: boolean;
    connected: boolean;
    teamName?: string;
    channelName?: string;
  }> {
    if (!this.isConfigured()) {
      return {
        configured: false,
        connected: false
      };
    }

    const connection = await prisma.slackConnection.findUnique({
      where: { userId }
    });

    if (!connection || connection.status !== 'ACTIVE') {
      return {
        configured: true,
        connected: false
      };
    }

    return {
      configured: true,
      connected: true,
      teamName: connection.teamName,
      channelName: connection.channelName || undefined
    };
  }

  /**
   * Send rate limit exhaustion notification to user's Slack
   * Debounced per sender per hour window using Redis
   */
  public static async notifyRateLimitExceeded(params: {
    userId: string;
    senderId: string;
    senderName: string;
    senderEmail: string;
    hourlyLimit: number;
    rescheduledTime: Date;
  }): Promise<boolean> {
    const currentMs = Date.now();
    const windowIndex = Math.floor(currentMs / 3600000);
    const debounceKey = `slack_alert:${params.senderId}:hour:${windowIndex}`;

    try {
      // Check if already notified for this hour window
      const alreadyNotified = await redisClient.get(debounceKey);
      if (alreadyNotified) {
        logger.debug(`Slack notification skipped (already alerted this hour) for sender ${params.senderId}`);
        return false;
      }

      // Fetch user's active Slack connection
      const connection = await prisma.slackConnection.findUnique({
        where: { userId: params.userId }
      });

      if (!connection || connection.status !== 'ACTIVE') {
        logger.debug(`No active Slack connection found for user ${params.userId}. Alert skipped.`);
        return false;
      }

      const decryptedToken = decrypt(connection.encryptedAccessToken);
      const client = new WebClient(decryptedToken);

      const targetChannel = connection.channelId || '#general';
      const formattedTime = params.rescheduledTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

      // Post formatted Slack Block Kit alert
      await client.chat.postMessage({
        channel: targetChannel,
        text: `⚠️ Rate limit reached for sender ${params.senderName} (${params.senderEmail})`,
        blocks: [
          {
            type: 'header',
            text: {
              type: 'plain_text',
              text: '⚠️ ReachInbox Rate Limit Alert',
              emoji: true
            }
          },
          {
            type: 'section',
            fields: [
              {
                type: 'mrkdwn',
                text: `*Sender:* ${params.senderName} (<${params.senderEmail}>)`
              },
              {
                type: 'mrkdwn',
                text: `*Hourly Quota:* ${params.hourlyLimit} emails/hour`
              },
              {
                type: 'mrkdwn',
                text: `*Status:* Quota Exhausted`
              },
              {
                type: 'mrkdwn',
                text: `*Next Send Window:* ~${formattedTime}`
              }
            ]
          },
          {
            type: 'context',
            elements: [
              {
                type: 'mrkdwn',
                text: 'Pending emails have been automatically deferred to the next hourly window without any message drops.'
              }
            ]
          }
        ]
      });

      // Mark as notified in Redis for this hour window (expire in 2 hours)
      await redisClient.set(debounceKey, '1', 'EX', 7200);
      logger.info(`Slack rate limit notification successfully sent to ${targetChannel} for sender ${params.senderEmail}`);
      return true;
    } catch (err: any) {
      logger.warn(`Failed to dispatch Slack notification for user ${params.userId}: ${err.message}`);
      return false;
    }
  }
}
