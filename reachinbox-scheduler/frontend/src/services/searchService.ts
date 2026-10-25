import { apiClient } from './api';
import { EmailRecord } from '../types';

export interface SearchResponse {
  success: boolean;
  total: number;
  hits: EmailRecord[];
}

export const searchService = {
  searchEmails: async (q: string, status?: string, from = 0, size = 20): Promise<SearchResponse> => {
    const params = new URLSearchParams();
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    params.set('from', String(from));
    params.set('size', String(size));

    const res = await apiClient.get<SearchResponse>(`/search/emails?${params.toString()}`);
    return res.data;
  },

  reindex: async (): Promise<{ success: boolean; indexedCount: number; errors: number }> => {
    const res = await apiClient.post<{ success: boolean; indexedCount: number; errors: number }>('/search/reindex');
    return res.data;
  }
};
