import { Request, Response } from 'express';
import crypto from 'crypto';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { enqueueEmailJob } from '../queues/emailQueue';
import { ElasticsearchService } from '../services/elasticsearchService';
import { ReconciliationService } from '../services/reconciliationService';
import { parseRecipientsCsv, isValidEmail, MAX_RECIPIENTS_PER_UPLOAD } from '../utils/csvParser';
import { logger } from '../utils/logger';
import { EmailStatus } from '../types';

const scheduleSchema = z.object({
  senderId: z.string().uuid(),
  subject: z.string().min(1, 'Subject is required').max(500),
  body: z.string().min(1, 'Body is required'),
  recipients: z.array(z.string()).optional(),
  startTime: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: 'Invalid start time date string'
  }),
  delayBetweenSendsMs: z.number().int().min(500).default(2000),
  hourlyLimit: z.number().int().positive().default(200)
});

export class EmailController {
  /**
   * Upload and validate a recipient CSV file before scheduling
   */
  public static async uploadCsv(req: Request, res: Response): Promise<void> {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No CSV file provided in upload' });
      return;
    }

    const result = parseRecipientsCsv(req.file.buffer);

    res.json({
      success: true,
      filename: req.file.originalname,
      totalDetected: result.validRecipients.length + result.invalidCount + result.duplicatesRemoved,
      validCount: result.validRecipients.length,
      invalidCount: result.invalidCount,
      duplicatesRemoved: result.duplicatesRemoved,
      validRecipients: result.validRecipients.slice(0, 100), // Preview first 100
      errors: result.errors
    });
  }

  /**
   * Schedule emails for dispatch
   */
  public static async scheduleEmails(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    // Support CSV file upload directly in the schedule request if multipart
    let parsedRecipients: string[] = [];

    if (req.file) {
      const csvResult = parseRecipientsCsv(req.file.buffer);
      parsedRecipients = csvResult.validRecipients;
    } else if (req.body.recipients) {
      // JSON array of strings or comma-delimited string
      const raw = Array.isArray(req.body.recipients)
        ? req.body.recipients
        : String(req.body.recipients).split(/[,\n]/);

      const seen = new Set<string>();
      for (const item of raw) {
        const cleaned = String(item).trim().toLowerCase();
        if (cleaned && isValidEmail(cleaned) && !seen.has(cleaned)) {
          seen.add(cleaned);
          parsedRecipients.push(cleaned);
          if (parsedRecipients.length >= MAX_RECIPIENTS_PER_UPLOAD) break;
        }
      }
    }

    if (parsedRecipients.length === 0) {
      res.status(400).json({
        success: false,
        error: 'No valid recipients provided. Please supply a list of valid emails or upload a CSV.'
      });
      return;
    }

    // Coerce numeric fields if sent as multipart form data
    const payload = {
      ...req.body,
      delayBetweenSendsMs: req.body.delayBetweenSendsMs ? Number(req.body.delayBetweenSendsMs) : 2000,
      hourlyLimit: req.body.hourlyLimit ? Number(req.body.hourlyLimit) : 200,
      recipients: parsedRecipients
    };

    const validated = scheduleSchema.parse(payload);

    // Verify start time is not in the distant past (allow 1 minute grace for client-server clock drift)
    const startDate = new Date(validated.startTime);
    const now = new Date();
    if (startDate.getTime() < now.getTime() - 60000) {
      res.status(400).json({
        success: false,
        error: 'Scheduled start time must be in the future.'
      });
      return;
    }

    // Verify sender ownership & active status
    const sender = await prisma.sender.findFirst({
      where: {
        id: validated.senderId,
        userId
      }
    });

    if (!sender) {
      res.status(404).json({ success: false, error: 'Sender not found or not owned by user' });
      return;
    }

    if (!sender.isActive) {
      res.status(400).json({ success: false, error: 'Selected sender account is inactive' });
      return;
    }

    // Begin transactional persistence: Create Campaign and EmailRecords
    const campaign = await prisma.$transaction(async (tx) => {
      const createdCampaign = await tx.campaign.create({
        data: {
          userId,
          subject: validated.subject,
          body: validated.body,
          startTime: startDate,
          delayBetweenSendsMs: validated.delayBetweenSendsMs,
          hourlyLimit: validated.hourlyLimit,
          status: 'SCHEDULED'
        }
      });

      // Prepare email records with staggered scheduled times
      const emailRecordsData = parsedRecipients.map((recipient, index) => {
        const scheduledTime = new Date(startDate.getTime() + index * validated.delayBetweenSendsMs);
        const idempotencyKey = crypto.createHash('sha256')
          .update(`${createdCampaign.id}-${recipient}-${scheduledTime.getTime()}`)
          .digest('hex');

        return {
          campaignId: createdCampaign.id,
          senderId: sender.id,
          recipientEmail: recipient,
          subjectSnapshot: validated.subject,
          bodySnapshot: validated.body,
          status: 'scheduled',
          scheduledTime,
          idempotencyKey
        };
      });

      await tx.emailRecord.createMany({
        data: emailRecordsData
      });

      return createdCampaign;
    });

    // Fetch the persisted records with generated IDs
    const createdRecords = await prisma.emailRecord.findMany({
      where: { campaignId: campaign.id },
      orderBy: { scheduledTime: 'asc' }
    });

    // Asynchronously enqueue delayed BullMQ jobs for each email record
    // and sync with Elasticsearch
    let enqueuedCount = 0;
    for (const record of createdRecords) {
      try {
        await enqueueEmailJob(
          {
            emailRecordId: record.id,
            campaignId: campaign.id,
            senderId: sender.id,
            recipientEmail: record.recipientEmail,
            subject: record.subjectSnapshot,
            body: record.bodySnapshot,
            scheduledTime: record.scheduledTime.toISOString(),
            idempotencyKey: record.idempotencyKey
          },
          record.scheduledTime
        );
        enqueuedCount++;

        // Sync with Elasticsearch
        ElasticsearchService.indexEmail({
          id: record.id,
          userId,
          campaignId: campaign.id,
          senderId: sender.id,
          recipientEmail: record.recipientEmail,
          subject: record.subjectSnapshot,
          status: 'scheduled',
          scheduledTime: record.scheduledTime.toISOString(),
          sentTime: null,
          createdAt: record.createdAt.toISOString()
        }).catch((esErr) => logger.warn(`Elasticsearch index notice: ${esErr.message}`));
      } catch (queueErr: any) {
        logger.error(`BullMQ enqueue failed for record ${record.id}: ${queueErr.message}. Outbox reconciliation will recover this job.`);
      }
    }

    res.status(201).json({
      success: true,
      message: `Successfully scheduled ${createdRecords.length} emails.`,
      campaign: {
        id: campaign.id,
        subject: campaign.subject,
        startTime: campaign.startTime,
        recipientCount: createdRecords.length,
        enqueuedJobs: enqueuedCount
      }
    });
  }

  /**
   * List scheduled emails
   */
  public static async getScheduledEmails(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const where = {
      campaign: { userId },
      status: { in: ['scheduled', 'deferred', 'processing'] }
    };

    const [total, emails] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { scheduledTime: 'asc' },
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { id: true, subject: true } }
        }
      })
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails
    });
  }

  /**
   * List sent emails
   */
  public static async getSentEmails(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const where = {
      campaign: { userId },
      status: 'sent'
    };

    const [total, emails] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { sentTime: 'desc' },
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { id: true, subject: true } }
        }
      })
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails
    });
  }

  /**
   * List failed emails
   */
  public static async getFailedEmails(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const page = Math.max(1, parseInt(String(req.query.page || '1'), 10));
    const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit || '20'), 10)));
    const skip = (page - 1) * limit;

    const where = {
      campaign: { userId },
      status: 'failed'
    };

    const [total, emails] = await Promise.all([
      prisma.emailRecord.count({ where }),
      prisma.emailRecord.findMany({
        where,
        skip,
        take: limit,
        orderBy: { updatedAt: 'desc' },
        include: {
          sender: { select: { name: true, email: true } },
          campaign: { select: { id: true, subject: true } }
        }
      })
    ]);

    res.json({
      success: true,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      emails
    });
  }

  /**
   * Get single email record by ID
   */
  public static async getEmailById(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;

    const email = await prisma.emailRecord.findFirst({
      where: {
        id,
        campaign: { userId }
      },
      include: {
        sender: true,
        campaign: true
      }
    });

    if (!email) {
      res.status(404).json({ success: false, error: 'Email record not found or access denied' });
      return;
    }

    res.json({
      success: true,
      email
    });
  }

  /**
   * Reconcile outbox jobs with BullMQ
   */
  public static async reconcileOutbox(req: Request, res: Response): Promise<void> {
    const result = await ReconciliationService.reconcilePendingEmails();
    res.json({
      success: true,
      message: 'Reconciliation run completed',
      ...result
    });
  }
}
