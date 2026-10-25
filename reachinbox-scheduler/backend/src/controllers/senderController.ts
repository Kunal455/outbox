import { Request, Response } from 'express';
import { z } from 'zod';
import { prisma } from '../config/prisma';
import { RateLimiterService } from '../services/rateLimiter';
import { isValidEmail } from '../utils/csvParser';

const createSenderSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1, 'Sender name is required'),
  hourlyLimit: z.number().int().positive().default(200),
  minSendIntervalMs: z.number().int().min(500).default(2000)
});

const updateSenderSchema = z.object({
  name: z.string().min(1).optional(),
  hourlyLimit: z.number().int().positive().optional(),
  minSendIntervalMs: z.number().int().min(500).optional(),
  isActive: z.boolean().optional()
});

export class SenderController {
  /**
   * List all senders for the authenticated user with real-time rate limit metrics
   */
  public static async listSenders(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;

    const senders = await prisma.sender.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });

    // Enrich each sender with live rate limit status from Redis
    const enriched = await Promise.all(
      senders.map(async (sender) => {
        const status = await RateLimiterService.getSenderStatus(sender.id, sender.hourlyLimit);
        return {
          ...sender,
          rateLimitMetrics: status
        };
      })
    );

    res.json({
      success: true,
      senders: enriched
    });
  }

  /**
   * Create a new sender identity
   */
  public static async createSender(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const body = createSenderSchema.parse(req.body);

    if (!isValidEmail(body.email)) {
      res.status(400).json({ success: false, error: 'Invalid sender email address format' });
      return;
    }

    // Check if email already registered for this user
    const existing = await prisma.sender.findFirst({
      where: { userId, email: body.email.toLowerCase() }
    });

    if (existing) {
      res.status(409).json({ success: false, error: 'A sender with this email already exists in your account' });
      return;
    }

    const sender = await prisma.sender.create({
      data: {
        userId,
        email: body.email.toLowerCase(),
        name: body.name,
        hourlyLimit: body.hourlyLimit,
        minSendIntervalMs: body.minSendIntervalMs,
        isActive: true
      }
    });

    res.status(201).json({
      success: true,
      sender
    });
  }

  /**
   * Update an existing sender
   */
  public static async updateSender(req: Request, res: Response): Promise<void> {
    const userId = req.user!.userId;
    const { id } = req.params;
    const body = updateSenderSchema.parse(req.body);

    const sender = await prisma.sender.findFirst({
      where: { id, userId }
    });

    if (!sender) {
      res.status(404).json({ success: false, error: 'Sender not found or not owned by user' });
      return;
    }

    const updated = await prisma.sender.update({
      where: { id },
      data: {
        ...body,
        updatedAt: new Date()
      }
    });

    res.json({
      success: true,
      sender: updated
    });
  }
}
