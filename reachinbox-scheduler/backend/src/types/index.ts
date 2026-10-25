// Typed interfaces for ReachInbox Email Job Scheduler

export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'deferred';
export type CampaignStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface EmailJobData {
  emailRecordId: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledTime: string; // ISO string
  idempotencyKey: string;
  attemptNumber?: number;
}

export interface RateLimitCheckResult {
  allowed: boolean;
  reason?: 'hourly_limit' | 'min_delay';
  waitMs?: number;
  currentCount?: number;
  hourlyLimit?: number;
}

export interface SendEmailResult {
  success: boolean;
  providerMessageId?: string;
  previewUrl?: string;
  error?: string;
  isTransient?: boolean;
}

export interface CsvRecipientRow {
  email: string;
  [key: string]: string;
}

export interface CsvParseResult {
  validRecipients: string[];
  invalidCount: number;
  duplicatesRemoved: number;
  errors: string[];
}

export interface ElasticsearchEmailDocument {
  id: string;
  userId: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subject: string;
  status: EmailStatus;
  scheduledTime: string;
  sentTime?: string | null;
  createdAt: string;
}

export interface UserSessionPayload {
  userId: string;
  email: string;
  name: string;
  avatar?: string | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: UserSessionPayload;
    }
  }
}
