import nodemailer, { Transporter } from 'nodemailer';
import { env } from '../config/env';
import { logger } from '../utils/logger';
import { SendEmailResult } from '../types';

let transporterInstance: Transporter | null = null;
let currentEtherealUser: string | null = null;

// Transient SMTP error codes/strings that warrant a retry
const TRANSIENT_PATTERNS = [
  'ETIMEDOUT',
  'ECONNRESET',
  'ECONNREFUSED',
  'ENOTFOUND',
  '421',
  '450',
  '451',
  '452',
  'greeting never received',
  'socket hang up',
  'timeout'
];

export async function getSmtpTransporter(): Promise<Transporter> {
  if (transporterInstance) {
    return transporterInstance;
  }

  let user = env.ETHEREAL_USER;
  let pass = env.ETHEREAL_PASS;

  if (!user || !pass) {
    try {
      logger.info('No Ethereal credentials found in environment. Automatically provisioning new test account...');
      const testAccount = await nodemailer.createTestAccount();
      user = testAccount.user;
      pass = testAccount.pass;
      currentEtherealUser = user;
      logger.info(`Provisioned Ethereal Email test account: ${user} (Web: https://ethereal.email/login)`);
    } catch (err: any) {
      logger.warn(`Could not provision Ethereal account online (${err.message}). Using local JSON transport fallback.`);
      transporterInstance = nodemailer.createTransport({
        jsonTransport: true
      });
      return transporterInstance;
    }
  } else {
    currentEtherealUser = user;
  }

  transporterInstance = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user,
      pass
    },
    pool: true,
    maxConnections: 5,
    maxMessages: 100
  });

  return transporterInstance;
}

export function getCurrentEtherealUser(): string | null {
  return currentEtherealUser;
}

/**
 * Classify whether an error is transient (temporary network/server hiccup) or permanent.
 */
export function isTransientError(error: any): boolean {
  if (!error) return false;
  const message = (error.message || '').toLowerCase();
  const code = String(error.code || '');
  const responseCode = String(error.responseCode || '');

  return TRANSIENT_PATTERNS.some(
    pattern =>
      message.includes(pattern.toLowerCase()) ||
      code.includes(pattern) ||
      responseCode.startsWith('4')
  );
}

/**
 * Send an email via the configured SMTP transport.
 */
export async function sendEmail(params: {
  fromName: string;
  fromEmail: string;
  to: string;
  subject: string;
  body: string;
}): Promise<SendEmailResult> {
  try {
    const transporter = await getSmtpTransporter();

    const mailOptions = {
      from: `"${params.fromName}" <${params.fromEmail}>`,
      to: params.to,
      subject: params.subject,
      text: params.body,
      html: `<div style="font-family: sans-serif; line-height: 1.6; color: #333;">${params.body.replace(/\n/g, '<br/>')}</div>`
    };

    const info = await transporter.sendMail(mailOptions);
    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;

    logger.info(`Email successfully dispatched via SMTP to ${params.to}. MessageId: ${info.messageId}`);
    if (previewUrl) {
      logger.info(`Ethereal Email Preview URL: ${previewUrl}`);
    }

    return {
      success: true,
      providerMessageId: info.messageId,
      previewUrl
    };
  } catch (error: any) {
    const transient = isTransientError(error);
    logger.error(`SMTP delivery failed to ${params.to}: ${error.message} (Transient: ${transient})`);
    return {
      success: false,
      error: error.message || 'Unknown SMTP error',
      isTransient: transient
    };
  }
}
