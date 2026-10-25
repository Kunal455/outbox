import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const envSchema = z.object({
  PORT: z.string().default('5000').transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  CLIENT_URL: z.string().default('http://localhost:5173'),

  // PostgreSQL
  DATABASE_URL: z.string().default('postgresql://postgres:postgres@localhost:5432/reachinbox?schema=public'),

  // Redis
  REDIS_HOST: z.string().default('localhost'),
  REDIS_PORT: z.string().default('6379').transform((val) => parseInt(val, 10)),
  REDIS_PASSWORD: z.string().optional().default(''),

  // Scheduler & Rate Limiting
  WORKER_CONCURRENCY: z.string().default('5').transform((val) => parseInt(val, 10)),
  MIN_DELAY_MS: z.string().default('2000').transform((val) => parseInt(val, 10)),
  MAX_EMAILS_PER_HOUR_PER_SENDER: z.string().default('200').transform((val) => parseInt(val, 10)),

  // Nodemailer / Ethereal SMTP
  ETHEREAL_USER: z.string().optional().default(''),
  ETHEREAL_PASS: z.string().optional().default(''),

  // Elasticsearch
  ELASTICSEARCH_NODE: z.string().default('http://localhost:9200'),
  ELASTICSEARCH_INDEX: z.string().default('reachinbox_emails'),

  // Security
  JWT_SECRET: z.string().default('reachinbox_default_jwt_secret_key_change_in_production'),
  COOKIE_SECRET: z.string().default('reachinbox_default_cookie_secret_key_change_in_production'),
  ENCRYPTION_KEY: z.string().default('0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef'),

  // Google OAuth
  GOOGLE_CLIENT_ID: z.string().optional().default(''),
  GOOGLE_CLIENT_SECRET: z.string().optional().default(''),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:5000/api/auth/google/callback'),

  // Slack OAuth
  SLACK_CLIENT_ID: z.string().optional().default(''),
  SLACK_CLIENT_SECRET: z.string().optional().default(''),
  SLACK_REDIRECT_URI: z.string().default('http://localhost:5000/api/auth/slack/callback'),
  SLACK_SIGNING_SECRET: z.string().optional().default('')
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;
