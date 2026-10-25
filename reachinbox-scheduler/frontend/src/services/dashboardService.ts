import { apiClient } from './api';
import { DashboardStats } from '../types';

export const dashboardService = {
  getStats: async (): Promise<DashboardStats> => {
    const res = await apiClient.get<DashboardStats>('/dashboard/stats');
    return res.data;
  }
};
