import { apiClient } from './api';
import { EmailRecord, PaginatedResult, CsvPreviewResult } from '../types';

export interface ScheduleEmailPayload {
  senderId: string;
  subject: string;
  body: string;
  recipients: string[];
  startTime: string;
  delayBetweenSendsMs: number;
  hourlyLimit: number;
}

export interface ScheduleResponse {
  success: boolean;
  message: string;
  campaign: {
    id: string;
    subject: string;
    startTime: string;
    recipientCount: number;
    enqueuedJobs: number;
  };
}

export const emailService = {
  uploadCsv: async (file: File): Promise<CsvPreviewResult> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await apiClient.post<CsvPreviewResult>('/emails/upload-csv', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  schedule: async (payload: ScheduleEmailPayload): Promise<ScheduleResponse> => {
    const res = await apiClient.post<ScheduleResponse>('/emails/schedule', payload);
    return res.data;
  },

  getScheduledEmails: async (page = 1, limit = 20): Promise<PaginatedResult<EmailRecord>> => {
    const res = await apiClient.get<PaginatedResult<EmailRecord>>(`/emails/scheduled?page=${page}&limit=${limit}`);
    return res.data;
  },

  getSentEmails: async (page = 1, limit = 20): Promise<PaginatedResult<EmailRecord>> => {
    const res = await apiClient.get<PaginatedResult<EmailRecord>>(`/emails/sent?page=${page}&limit=${limit}`);
    return res.data;
  },

  getFailedEmails: async (page = 1, limit = 20): Promise<PaginatedResult<EmailRecord>> => {
    const res = await apiClient.get<PaginatedResult<EmailRecord>>(`/emails/failed?page=${page}&limit=${limit}`);
    return res.data;
  },

  getEmailById: async (id: string): Promise<EmailRecord> => {
    const res = await apiClient.get<{ success: boolean; email: EmailRecord }>(`/emails/${id}`);
    return res.data.email;
  },

  reconcile: async (): Promise<{ scanned: number; reconciled: number; alreadyQueued: number }> => {
    const res = await apiClient.post<{
      success: boolean;
      scanned: number;
      reconciled: number;
      alreadyQueued: number;
    }>('/emails/reconcile');
    return res.data;
  }
};
