import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';

const createCampaignSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val))),
  delayBetweenSendsMs: z.number().int().min(500).default(2000),
  hourlyLimit: z.number().int().positive().default(200)
});

export class CampaignController {
  /**
   * List all campaigns for current user
   */
  public static async listCampaigns(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const campaigns = await prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { emailRecords: true }
        }
      }
    });

    // Enrich with status counts
    const enriched = await Promise.all(
      campaigns.map(async (c) => {
        const [scheduledCount, sentCount, failedCount] = await Promise.all([
          prisma.emailRecord.count({ where: { campaignId: c.id, status: { in: ['scheduled', 'deferred', 'processing'] } } }),
          prisma.emailRecord.count({ where: { campaignId: c.id, status: 'sent' } }),
          prisma.emailRecord.count({ where: { campaignId: c.id, status: 'failed' } })
        ]);

        return {
          ...c,
          metrics: {
            totalEmails: c._count.emailRecords,
            scheduled: scheduledCount,
            sent: sentCount,
            failed: failedCount
          }
        };
      })
    );

    res.json({
      success: true,
      campaigns: enriched
    });
  }

  /**
   * Create campaign
   */
  public static async createCampaign(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const body = createCampaignSchema.parse(req.body);

    const campaign = await prisma.campaign.create({
      data: {
        userId,
        subject: body.subject,
        body: body.body,
        startTime: new Date(body.startTime),
        delayBetweenSendsMs: body.delayBetweenSendsMs,
        hourlyLimit: body.hourlyLimit,
        status: 'SCHEDULED'
      }
    });

    res.status(201).json({
      success: true,
      campaign
    });
  }

  /**
   * Get single campaign details
   */
  public static async getCampaignById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;

    const campaign = await prisma.campaign.findFirst({
      where: { id, userId },
      include: {
        emailRecords: {
          orderBy: { scheduledTime: 'asc' },
          take: 50,
          include: { sender: true }
        }
      }
    });

    if (!campaign) {
      res.status(404).json({ success: false, error: 'Campaign not found' });
      return;
    }

    const [scheduledCount, sentCount, failedCount] = await Promise.all([
      prisma.emailRecord.count({ where: { campaignId: id, status: { in: ['scheduled', 'deferred', 'processing'] } } }),
      prisma.emailRecord.count({ where: { campaignId: id, status: 'sent' } }),
      prisma.emailRecord.count({ where: { campaignId: id, status: 'failed' } })
    ]);

    res.json({
      success: true,
      campaign: {
        ...campaign,
        metrics: {
          total: scheduledCount + sentCount + failedCount,
          scheduled: scheduledCount,
          sent: sentCount,
          failed: failedCount
        }
      }
    });
  }
}
