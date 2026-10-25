import { apiClient } from './api';
import { Sender } from '../types';

export interface CreateSenderPayload {
  email: string;
  name: string;
  hourlyLimit: number;
  minSendIntervalMs: number;
}

export interface UpdateSenderPayload {
  name?: string;
  hourlyLimit?: number;
  minSendIntervalMs?: number;
  isActive?: boolean;
}

export const senderService = {
  listSenders: async (): Promise<Sender[]> => {
    const res = await apiClient.get<{ success: boolean; senders: Sender[] }>('/senders');
    return res.data.senders;
  },

  createSender: async (payload: CreateSenderPayload): Promise<Sender> => {
    const res = await apiClient.post<{ success: boolean; sender: Sender }>('/senders', payload);
    return res.data.sender;
  },

  updateSender: async (id: string, payload: UpdateSenderPayload): Promise<Sender> => {
    const res = await apiClient.patch<{ success: boolean; sender: Sender }>(`/senders/${id}`, payload);
    return res.data.sender;
  }
};
