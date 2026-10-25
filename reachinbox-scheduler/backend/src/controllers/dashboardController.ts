import { Request, Response } from 'express';
import { prisma } from '../config/prisma';
import { emailQueue } from '../queues/emailQueue';
import { isEsConnected } from '../config/elasticsearch';
import { getCurrentEtherealUser } from '../services/smtpService';
import { SlackService } from '../services/slackService';

export class DashboardController {
  /**
   * Get dashboard metrics and system connectivity status
   */
  public static async getStats(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const [
      totalScheduled,
      totalSent,
      totalFailed,
      totalDeferred,
      totalCampaigns,
      activeSendersCount,
      recentEmails
    ] = await Promise.all([
      prisma.emailRecord.count({ where: { campaign: { userId }, status: 'scheduled' } }),
      prisma.emailRecord.count({ where: { campaign: { userId }, status: 'sent' } }),
      prisma.emailRecord.count({ where: { campaign: { userId }, status: 'failed' } }),
      prisma.emailRecord.count({ where: { campaign: { userId }, status: 'deferred' } }),
      prisma.campaign.count({ where: { userId } }),
      prisma.sender.count({ where: { userId, isActive: true } }),
      prisma.emailRecord.findMany({
        where: { campaign: { userId } },
        orderBy: { updatedAt: 'desc' },
        take: 8,
        include: { sender: { select: { name: true, email: true } } }
      })
    ]);

    // Inspect BullMQ queue metrics
    let queueStats: Record<string, number> = {
      waiting: 0,
      active: 0,
      delayed: 0,
      completed: 0,
      failed: 0
    };

    try {
      const counts = await emailQueue.getJobCounts('waiting', 'active', 'delayed', 'completed', 'failed');
      queueStats = { ...queueStats, ...counts };
    } catch (err: any) {
      // Queue might be starting or Redis connecting
    }

    const slackStatus = await SlackService.getConnectionStatus(userId);

    res.json({
      success: true,
      metrics: {
        totalScheduled,
        totalSent,
        totalFailed,
        totalDeferred,
        totalCampaigns,
        activeSendersCount
      },
      queueMetrics: queueStats,
      systemHealth: {
        database: 'connected',
        elasticsearch: isEsConnected() ? 'connected' : 'degraded_db_fallback',
        smtp: 'ethereal_ready',
        etherealAccount: getCurrentEtherealUser() || 'auto-provisioned',
        slackConfigured: slackStatus.configured,
        slackConnected: slackStatus.connected
      },
      recentEmails
    });
  }
}
