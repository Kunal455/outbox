import { apiClient } from './api';
import { Campaign } from '../types';

export const campaignService = {
  listCampaigns: async (): Promise<Campaign[]> => {
    const res = await apiClient.get<{ success: boolean; campaigns: Campaign[] }>('/campaigns');
    return res.data.campaigns;
  },

  getCampaignById: async (id: string): Promise<Campaign> => {
    const res = await apiClient.get<{ success: boolean; campaign: Campaign }>(`/campaigns/${id}`);
    return res.data.campaign;
  }
};
