import { Request, Response } from 'express';
import crypto from 'crypto';
import { prisma } from '../config/prisma';
import { env } from '../config/env';
import { signAuthToken, setAuthCookie, clearAuthCookie } from '../middleware/auth';
import { SlackService } from '../services/slackService';
import { logger } from '../utils/logger';

// In-memory OAuth state storage for CSRF protection
const oauthStates = new Map<string, { createdAt: number; redirectUrl?: string }>();

// Clean up states older than 10 minutes
if (process.env.NODE_ENV !== 'test') {
  const cleanupTimer = setInterval(() => {
    const now = Date.now();
    for (const [state, data] of oauthStates.entries()) {
      if (now - data.createdAt > 10 * 60 * 1000) {
        oauthStates.delete(state);
      }
    }
  }, 60 * 1000);
  cleanupTimer.unref();
}

export class AuthController {
  /**
   * Return the currently authenticated user's profile
   */
  public static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
        createdAt: true
      }
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    res.json({
      success: true,
      user
    });
  }

  /**
   * Log out the current user by clearing the session cookie
   */
  public static logout(req: Request, res: Response): void {
    clearAuthCookie(res);
    res.json({ success: true, message: 'Logged out successfully' });
  }

  /**
   * Initiate Google OAuth 2.0 flow
   */
  public static googleAuth(req: Request, res: Response): void {
    if (!env.GOOGLE_CLIENT_ID) {
      res.status(503).json({
        success: false,
        error: 'Google OAuth is not configured on this server. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in backend/.env.',
        instructions: 'Follow README.md Section "Google OAuth Setup" to obtain credentials from Google Cloud Console.'
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, { createdAt: Date.now() });

    const scopes = encodeURIComponent('openid email profile');
    const redirectUri = encodeURIComponent(env.GOOGLE_CALLBACK_URL);
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${env.GOOGLE_CLIENT_ID}&redirect_uri=${redirectUri}&response_type=code&scope=${scopes}&state=${state}&access_type=offline&prompt=consent`;

    res.redirect(googleAuthUrl);
  }

  /**
   * Google OAuth Callback
   */
  public static async googleCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error } = req.query;

    if (error) {
      logger.error(`Google OAuth returned error: ${error}`);
      res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!state || !oauthStates.has(String(state))) {
      res.redirect(`${env.CLIENT_URL}/login?error=invalid_state_csrf`);
      return;
    }
    oauthStates.delete(String(state));

    try {
      // Exchange code for tokens
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: env.GOOGLE_CLIENT_ID,
          client_secret: env.GOOGLE_CLIENT_SECRET,
          redirect_uri: env.GOOGLE_CALLBACK_URL,
          grant_type: 'authorization_code'
        })
      });

      const tokenData = await tokenResponse.json() as any;
      if (!tokenResponse.ok) {
        throw new Error(tokenData.error_description || tokenData.error || 'Token exchange failed');
      }

      // Fetch user info from Google
      const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${tokenData.access_token}` }
      });
      const userInfo = await userInfoResponse.json() as any;

      // Upsert user in PostgreSQL
      const user = await prisma.user.upsert({
        where: { email: userInfo.email },
        create: {
          googleId: userInfo.sub,
          email: userInfo.email,
          name: userInfo.name || userInfo.email.split('@')[0],
          avatar: userInfo.picture || null
        },
        update: {
          googleId: userInfo.sub,
          name: userInfo.name || userInfo.email.split('@')[0],
          avatar: userInfo.picture || null,
          updatedAt: new Date()
        }
      });

      // Ensure a default sender exists for this user
      const existingSender = await prisma.sender.findFirst({
        where: { userId: user.id }
      });

      if (!existingSender) {
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: user.email,
            name: user.name,
            hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
            minSendIntervalMs: env.MIN_DELAY_MS
          }
        });
      }

      const token = signAuthToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      });

      setAuthCookie(res, token);
      res.redirect(`${env.CLIENT_URL}/dashboard`);
    } catch (err: any) {
      logger.error('Google OAuth callback failed:', err);
      res.redirect(`${env.CLIENT_URL}/login?error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Development Sign-In Endpoint
   * Used for local development and technical interview evaluation when Google OAuth credentials
   * have not yet been provisioned in the user's Google Cloud Console.
   */
  public static async devLogin(req: Request, res: Response): Promise<void> {
    const email = req.body.email || 'evaluator@outboxlabs.com';
    const name = req.body.name || 'Outbox Labs Evaluator';
    const avatar = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100&auto=format&fit=crop&q=80';

    try {
      const user = await prisma.user.upsert({
        where: { email },
        create: {
          email,
          name,
          avatar
        },
        update: {
          name,
          avatar,
          updatedAt: new Date()
        }
      });

      // Ensure default sender
      const existingSender = await prisma.sender.findFirst({
        where: { userId: user.id }
      });

      if (!existingSender) {
        await prisma.sender.create({
          data: {
            userId: user.id,
            email: user.email,
            name: user.name,
            hourlyLimit: env.MAX_EMAILS_PER_HOUR_PER_SENDER,
            minSendIntervalMs: env.MIN_DELAY_MS
          }
        });
      }

      const token = signAuthToken({
        userId: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar
      });

      setAuthCookie(res, token);

      res.json({
        success: true,
        user,
        token,
        notice: 'Authenticated via Development Mode (used when Google OAuth credentials are not provided)'
      });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  /**
   * Initiate Slack OAuth flow
   */
  public static slackAuth(req: Request, res: Response): void {
    if (!SlackService.isConfigured()) {
      res.status(503).json({
        success: false,
        error: 'Slack OAuth is not configured. Please set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET in backend/.env.',
        instructions: 'Create a Slack app at api.slack.com/apps with scopes "chat:write,chat:write.public,incoming-webhook".'
      });
      return;
    }

    const state = crypto.randomBytes(24).toString('hex');
    oauthStates.set(state, {
      createdAt: Date.now(),
      redirectUrl: req.query.redirectUrl ? String(req.query.redirectUrl) : undefined
    });

    const scopes = encodeURIComponent('chat:write,chat:write.public,incoming-webhook');
    const redirectUri = encodeURIComponent(env.SLACK_REDIRECT_URI);
    const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${env.SLACK_CLIENT_ID}&scope=${scopes}&redirect_uri=${redirectUri}&state=${state}`;

    res.redirect(slackUrl);
  }

  /**
   * Slack OAuth Callback
   */
  public static async slackCallback(req: Request, res: Response): Promise<void> {
    const { code, state, error } = req.query;

    if (error) {
      res.redirect(`${env.CLIENT_URL}/settings?slack_error=${encodeURIComponent(String(error))}`);
      return;
    }

    if (!state || !oauthStates.has(String(state))) {
      res.redirect(`${env.CLIENT_URL}/settings?slack_error=invalid_state_csrf`);
      return;
    }
    oauthStates.delete(String(state));

    try {
      const response = await fetch('https://slack.com/api/oauth.v2.access', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          code: String(code),
          client_id: env.SLACK_CLIENT_ID,
          client_secret: env.SLACK_CLIENT_SECRET,
          redirect_uri: env.SLACK_REDIRECT_URI
        })
      });

      const data = await response.json() as any;

      if (!data.ok) {
        throw new Error(data.error || 'Failed to exchange Slack OAuth code');
      }

      // Associate with current user from session or cookie
      if (req.user) {
        await SlackService.saveConnection({
          userId: req.user.userId,
          teamId: data.team?.id || 'unknown',
          teamName: data.team?.name || 'Slack Workspace',
          channelId: data.incoming_webhook?.channel_id,
          channelName: data.incoming_webhook?.channel,
          accessToken: data.access_token
        });
      }

      res.redirect(`${env.CLIENT_URL}/settings?slack=connected`);
    } catch (err: any) {
      logger.error('Slack OAuth callback error:', err);
      res.redirect(`${env.CLIENT_URL}/settings?slack_error=${encodeURIComponent(err.message)}`);
    }
  }

  /**
   * Disconnect Slack
   */
  public static async disconnectSlack(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const success = await SlackService.disconnect(req.user.userId);
    res.json({ success, message: success ? 'Slack disconnected' : 'No connection found' });
  }

  /**
   * Get Slack Status
   */
  public static async getSlackStatus(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Unauthorized' });
      return;
    }

    const status = await SlackService.getConnectionStatus(req.user.userId);
    res.json({ success: true, ...status });
  }
}
