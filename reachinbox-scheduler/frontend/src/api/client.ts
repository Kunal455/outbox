import axios from 'axios';
import {
  User,
  Sender,
  EmailRecord,
  Campaign,
  DashboardStats,
  CsvPreviewResult
} from '../types';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercept token from localStorage if dev token stored
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('reachinbox_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const apiClient = {
  // Auth
  auth: {
    getMe: async (): Promise<{ success: boolean; user: User }> => {
      const res = await api.get('/auth/me');
      return res.data;
    },
    devLogin: async (email?: string, name?: string): Promise<{ success: boolean; user: User; token: string }> => {
      const res = await api.post('/auth/dev-login', { email, name });
      if (res.data.token) {
        localStorage.setItem('reachinbox_token', res.data.token);
      }
      return res.data;
    },
    logout: async (): Promise<void> => {
      await api.post('/auth/logout');
      localStorage.removeItem('reachinbox_token');
    },
    getSlackStatus: async (): Promise<{ configured: boolean; connected: boolean; teamName?: string }> => {
      const res = await api.get('/auth/slack/status');
      return res.data;
    },
    disconnectSlack: async (): Promise<{ success: boolean }> => {
      const res = await api.delete('/auth/slack/disconnect');
      return res.data;
    }
  },

  // Senders
  senders: {
    list: async (): Promise<Sender[]> => {
      const res = await api.get('/senders');
      return res.data.senders;
    },
    create: async (data: { email: string; name: string; hourlyLimit: number; minSendIntervalMs: number }): Promise<Sender> => {
      const res = await api.post('/senders', data);
      return res.data.sender;
    },
    update: async (id: string, data: Partial<Sender>): Promise<Sender> => {
      const res = await api.patch(`/senders/${id}`, data);
      return res.data.sender;
    }
  },

  // Emails
  emails: {
    uploadCsv: async (file: File): Promise<CsvPreviewResult> => {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/emails/upload-csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return res.data;
    },
    schedule: async (data: {
      senderId: string;
      subject: string;
      body: string;
      recipients: string[];
      startTime: string;
      delayBetweenSendsMs: number;
      hourlyLimit: number;
    }): Promise<any> => {
      const res = await api.post('/emails/schedule', data);
      return res.data;
    },
    getScheduled: async (page = 1, limit = 20): Promise<{ total: number; emails: EmailRecord[]; totalPages: number }> => {
      const res = await api.get(`/emails/scheduled?page=${page}&limit=${limit}`);
      return res.data;
    },
    getSent: async (page = 1, limit = 20): Promise<{ total: number; emails: EmailRecord[]; totalPages: number }> => {
      const res = await api.get(`/emails/sent?page=${page}&limit=${limit}`);
      return res.data;
    },
    getFailed: async (page = 1, limit = 20): Promise<{ total: number; emails: EmailRecord[]; totalPages: number }> => {
      const res = await api.get(`/emails/failed?page=${page}&limit=${limit}`);
      return res.data;
    },
    getById: async (id: string): Promise<EmailRecord> => {
      const res = await api.get(`/emails/${id}`);
      return res.data.email;
    },
    reconcile: async (): Promise<{ scanned: number; reconciled: number; alreadyQueued: number }> => {
      const res = await api.post('/emails/reconcile');
      return res.data;
    }
  },

  // Campaigns
  campaigns: {
    list: async (): Promise<Campaign[]> => {
      const res = await api.get('/campaigns');
      return res.data.campaigns;
    },
    getById: async (id: string): Promise<Campaign> => {
      const res = await api.get(`/campaigns/${id}`);
      return res.data.campaign;
    }
  },

  // Search
  search: {
    searchEmails: async (q?: string, status?: string, from = 0, size = 20): Promise<{ total: number; hits: any[] }> => {
      const params = new URLSearchParams();
      if (q) params.set('q', q);
      if (status) params.set('status', status);
      params.set('from', String(from));
      params.set('size', String(size));
      const res = await api.get(`/search/emails?${params.toString()}`);
      return res.data;
    },
    reindex: async (): Promise<{ indexedCount: number; errors: number }> => {
      const res = await api.post('/search/reindex');
      return res.data;
    }
  },

  // Dashboard
  dashboard: {
    getStats: async (): Promise<DashboardStats> => {
      const res = await api.get('/dashboard/stats');
      return res.data;
    }
  }
};
