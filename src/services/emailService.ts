import emailjs from '@emailjs/nodejs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface SendEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
}

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_BASE_DELAY_MS = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getEmailJsConfig() {
  return {
    serviceId: process.env.EMAILJS_SERVICE_ID?.trim(),
    templateId: process.env.EMAILJS_TEMPLATE_ID?.trim(),
    publicKey: process.env.EMAILJS_PUBLIC_KEY?.trim(),
    privateKey: process.env.EMAILJS_PRIVATE_KEY?.trim(),
  };
}

function isEmailJsConfigured(): boolean {
  const { serviceId, templateId, publicKey, privateKey } = getEmailJsConfig();
  return Boolean(serviceId && templateId && publicKey && privateKey);
}

function getMaxAttempts(): number {
  const parsed = Number(process.env.EMAIL_MAX_RETRIES);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_MAX_ATTEMPTS;
}

function getBaseDelayMs(): number {
  const parsed = Number(process.env.EMAIL_RETRY_DELAY_MS);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_BASE_DELAY_MS;
}

function isRetryableEmailError(error: unknown): boolean {
  const message = (error instanceof Error ? error.message : String(error)).toLowerCase();

  if (
    message.includes('not configured') ||
    message.includes('invalid') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    (message.includes('template') && message.includes('not found')) ||
    message.includes('service id') ||
    message.includes('public key') ||
    message.includes('private key')
  ) {
    return false;
  }

  return true;
}

function logEmailError(action: string, params: SendEmailParams, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[email] ${action} "${params.subject}" to ${params.to_email}: ${detail}`);
}

async function sendViaEmailJs(params: SendEmailParams): Promise<void> {
  const { serviceId, templateId, publicKey, privateKey } = getEmailJsConfig();

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    throw new Error(
      'EmailJS is not configured. Set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY.'
    );
  }

  const { to_email, to_name, subject, message } = params;

  await emailjs.send(
    serviceId,
    templateId,
    { to_email, to_name, subject, message },
    { publicKey, privateKey }
  );
}

async function sendWithRetry(params: SendEmailParams): Promise<void> {
  const maxAttempts = getMaxAttempts();
  const baseDelayMs = getBaseDelayMs();
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sendViaEmailJs(params);
      if (attempt > 1) {
        console.info(`[email] Sent on retry attempt ${attempt}/${maxAttempts}`);
      }
      return;
    } catch (error) {
      lastError = error;
      const retryable = isRetryableEmailError(error);
      const isLastAttempt = attempt === maxAttempts;

      if (isLastAttempt || !retryable) {
        throw error;
      }

      const delayMs = baseDelayMs * 2 ** (attempt - 1);
      console.warn(
        `[email] Attempt ${attempt}/${maxAttempts} failed for "${params.subject}" to ${params.to_email}; retrying in ${delayMs}ms`
      );
      await sleep(delayMs);
    }
  }

  throw lastError;
}

/**
 * Verify EmailJS credentials on server startup (non-blocking friendly).
 */
export async function verifySmtpConnection(): Promise<boolean> {
  if (!isEmailJsConfigured()) {
    console.warn(
      '[email] EmailJS not configured — set EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY, and EMAILJS_PRIVATE_KEY.'
    );
    return false;
  }

  console.info('[email] EmailJS ready');
  return true;
}

/**
 * Send an email via EmailJS with retries. OTP codes and reset tokens are never returned from endpoints.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to_email, to_name, subject } = params;

  await sendWithRetry(params);

  console.info(`[email] Sent "${subject}" to ${to_name} <${to_email}>`);
}

/**
 * Queue an email without blocking the caller. Retries run in the background; final failure is logged.
 */
export function queueEmail(params: SendEmailParams): void {
  console.info(`[email] Queuing "${params.subject}" to ${params.to_email}`);
  void sendEmail(params).catch((error) => {
    logEmailError('Failed to send after retries', params, error);
  });
}
