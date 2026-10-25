import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import { UserSessionPayload } from '../types';

export const AUTH_COOKIE_NAME = 'reachinbox_token';

/**
 * Generate a signed JWT token for user session
 */
export function signAuthToken(payload: UserSessionPayload): string {
  return jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: '7d'
  });
}

/**
 * Set HTTP-only secure cookie
 */
export function setAuthCookie(res: Response, token: string): void {
  const isProduction = env.NODE_ENV === 'production';
  res.cookie(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 3600 * 1000 // 7 days
  });
}

/**
 * Clear authentication cookie
 */
export function clearAuthCookie(res: Response): void {
  const isProduction = env.NODE_ENV === 'production';
  res.clearCookie(AUTH_COOKIE_NAME, {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax'
  });
}

/**
 * Authentication middleware enforcing authenticated requests
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  // Extract token from HTTP-only cookie or Authorization header
  let token = req.cookies?.[AUTH_COOKIE_NAME];

  if (!token && req.headers.authorization) {
    const parts = req.headers.authorization.split(' ');
    if (parts.length === 2 && parts[0] === 'Bearer') {
      token = parts[1];
    }
  }

  if (!token) {
    res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in.'
    });
    return;
  }

  try {
    const decoded = jwt.verify(token, env.JWT_SECRET) as UserSessionPayload;
    req.user = decoded;
    next();
  } catch (err: any) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired session. Please sign in again.'
    });
  }
}
