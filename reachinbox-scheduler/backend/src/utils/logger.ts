export const logger = {
  info: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.log(`[${timestamp}] [INFO] ${message}`, sanitizeMeta(meta));
    } else {
      console.log(`[${timestamp}] [INFO] ${message}`);
    }
  },
  warn: (message: string, meta?: any) => {
    const timestamp = new Date().toISOString();
    if (meta) {
      console.warn(`[${timestamp}] [WARN] ${message}`, sanitizeMeta(meta));
    } else {
      console.warn(`[${timestamp}] [WARN] ${message}`);
    }
  },
  error: (message: string, error?: any) => {
    const timestamp = new Date().toISOString();
    if (error) {
      const errObj = error instanceof Error ? { message: error.message, stack: error.stack } : error;
      console.error(`[${timestamp}] [ERROR] ${message}`, sanitizeMeta(errObj));
    } else {
      console.error(`[${timestamp}] [ERROR] ${message}`);
    }
  },
  debug: (message: string, meta?: any) => {
    if (process.env.DEBUG === 'true' || process.env.NODE_ENV === 'development') {
      const timestamp = new Date().toISOString();
      console.debug(`[${timestamp}] [DEBUG] ${message}`, meta ? sanitizeMeta(meta) : '');
    }
  }
};

// Mask sensitive fields from logging
function sanitizeMeta(obj: any): any {
  if (!obj || typeof obj !== 'object') return obj;
  const sensitiveKeys = ['password', 'token', 'secret', 'encryptedaccesstoken', 'authorization', 'cookie', 'jwt'];
  const sanitized: any = Array.isArray(obj) ? [] : {};

  for (const [key, value] of Object.entries(obj)) {
    if (sensitiveKeys.some(s => key.toLowerCase().includes(s))) {
      sanitized[key] = '***REDACTED***';
    } else if (value && typeof value === 'object') {
      sanitized[key] = sanitizeMeta(value);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}
