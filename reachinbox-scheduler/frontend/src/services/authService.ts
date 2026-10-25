import { apiClient } from './api';
import { User, SlackStatus } from '../types';

export const authService = {
  getCurrentUser: async (): Promise<User | null> => {
    try {
      const res = await apiClient.get<{ success: boolean; user: User }>('/auth/me');
      return res.data.user;
    } catch {
      return null;
    }
  },

  devLogin: async (email?: string, name?: string): Promise<{ user: User; token: string }> => {
    const res = await apiClient.post<{ success: boolean; user: User; token: string }>('/auth/dev-login', {
      email,
      name
    });
    if (res.data.token) {
      localStorage.setItem('reachinbox_token', res.data.token);
    }
    return { user: res.data.user, token: res.data.token };
  },

  logout: async (): Promise<void> => {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      localStorage.removeItem('reachinbox_token');
    }
  },

  getGoogleAuthUrl: (): string => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    return `${apiBase}/auth/google`;
  },

  getSlackAuthUrl: (): string => {
    const apiBase = import.meta.env.VITE_API_URL || '/api';
    return `${apiBase}/auth/slack`;
  },

  getSlackStatus: async (): Promise<SlackStatus> => {
    const res = await apiClient.get<{
      configured: boolean;
      connected: boolean;
      teamName?: string;
      channelName?: string;
    }>('/auth/slack/status');
    return {
      configured: res.data.configured,
      connected: res.data.connected,
      teamName: res.data.teamName,
      channelName: res.data.channelName
    };
  },

  disconnectSlack: async (): Promise<void> => {
    await apiClient.delete('/auth/slack/disconnect');
  }
};
