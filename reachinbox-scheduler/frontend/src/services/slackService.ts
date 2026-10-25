import { authService } from './authService';

export const slackService = {
  getStatus: authService.getSlackStatus,
  getConnectUrl: authService.getSlackAuthUrl,
  disconnect: authService.disconnectSlack
};
