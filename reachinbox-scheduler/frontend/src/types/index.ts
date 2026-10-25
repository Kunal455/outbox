export type EmailStatus = 'scheduled' | 'processing' | 'sent' | 'failed' | 'deferred';
export type CampaignStatus = 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'CANCELLED';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string | null;
  googleId?: string | null;
  createdAt?: string;
}

export interface SenderRateLimitMetrics {
  sentThisHour: number;
  remainingQuota: number;
  nextResetSeconds: number;
}

export interface Sender {
  id: string;
  userId: string;
  email: string;
  name: string;
  hourlyLimit: number;
  minSendIntervalMs: number;
  isActive: boolean;
  rateLimitMetrics?: SenderRateLimitMetrics;
  createdAt: string;
  updatedAt: string;
}

export interface EmailRecord {
  id: string;
  campaignId: string;
  senderId: string;
  recipientEmail: string;
  subjectSnapshot: string;
  bodySnapshot: string;
  status: EmailStatus;
  scheduledTime: string;
  sentTime?: string | null;
  attemptCount: number;
  lastError?: string | null;
  providerMessageId?: string | null;
  previewUrl?: string | null;
  idempotencyKey: string;
  createdAt: string;
  updatedAt: string;
  sender?: {
    name: string;
    email: string;
  };
  campaign?: {
    id: string;
    subject: string;
  };
}

export interface CampaignMetrics {
  totalEmails?: number;
  total?: number;
  scheduled: number;
  sent: number;
  failed: number;
}

export interface Campaign {
  id: string;
  userId: string;
  subject: string;
  body: string;
  startTime: string;
  delayBetweenSendsMs: number;
  hourlyLimit: number;
  status: CampaignStatus;
  createdAt: string;
  updatedAt: string;
  metrics?: CampaignMetrics;
  emailRecords?: EmailRecord[];
}

export interface DashboardMetrics {
  totalScheduled: number;
  totalSent: number;
  totalFailed: number;
  totalDeferred: number;
  totalCampaigns: number;
  activeSendersCount: number;
}

export interface QueueMetrics {
  waiting: number;
  active: number;
  delayed: number;
  completed: number;
  failed: number;
}

export interface SystemHealth {
  database: string;
  elasticsearch: string;
  smtp: string;
  etherealAccount: string;
  slackConfigured: boolean;
  slackConnected: boolean;
}

export interface DashboardStats {
  metrics: DashboardMetrics;
  queueMetrics: QueueMetrics;
  systemHealth: SystemHealth;
  recentEmails: EmailRecord[];
}

export interface SlackStatus {
  configured: boolean;
  connected: boolean;
  teamName?: string;
  channelName?: string;
}

export interface CsvRecipientResult {
  validRecipients: string[];
  invalidCount: number;
  duplicatesRemoved: number;
  errors: string[];
}

export interface CsvPreviewResult {
  success: boolean;
  filename?: string;
  totalDetected?: number;
  validCount: number;
  invalidCount: number;
  duplicatesRemoved: number;
  validRecipients: string[];
  errors: string[];
}

export interface PaginatedResult<T> {
  success: boolean;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  emails?: T[];
  data?: T[];
}

export interface SearchResult {
  success: boolean;
  total: number;
  hits: EmailRecord[];
}
