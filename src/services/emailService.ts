import { Resend } from 'resend';
import path from 'path';
import dotenv from 'dotenv';

// Ensure .env is loaded even when this module is imported before index.ts
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

export interface SendEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
}

let resendClient: Resend | null = null;

function getResendApiKey(): string | undefined {
  return process.env.RESEND_API_KEY?.trim();
}

function getResendClient(): Resend {
  if (resendClient) return resendClient;

  const apiKey = getResendApiKey();
  if (!apiKey) {
    throw new Error(
      'Email is not configured. Set RESEND_API_KEY in your environment.'
    );
  }

  resendClient = new Resend(apiKey);
  return resendClient;
}

function getFromAddress(): string {
  return process.env.RESEND_FROM?.trim() || 'Dreamize <onboarding@resend.dev>';
}

function logEmailError(action: string, params: SendEmailParams, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[email] ${action} "${params.subject}" to ${params.to_email}: ${detail}`);
}

/**
 * Verify Resend API key on server startup (HTTPS — works on Render free tier).
 */
export async function verifySmtpConnection(): Promise<boolean> {
  const apiKey = getResendApiKey();

  if (!apiKey) {
    console.warn('[email] Resend not configured — set RESEND_API_KEY in your environment.');
    return false;
  }

  try {
    const { error } = await getResendClient().domains.list();
    if (error) {
      throw new Error(error.message);
    }
    console.info(`[email] Resend ready (from: ${getFromAddress()})`);
    return true;
  } catch (error) {
    logEmailError('Resend verify failed for', {
      to_email: getFromAddress(),
      to_name: 'Resend',
      subject: 'connection test',
      message: '',
    }, error);
    return false;
  }
}

/**
 * Send an email via Resend. OTP codes and reset tokens are never returned from endpoints.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to_email, to_name, subject, message } = params;

  const { error } = await getResendClient().emails.send({
    from: getFromAddress(),
    to: [to_email],
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
    replyTo: process.env.RESEND_REPLY_TO?.trim() || undefined,
  });

  if (error) {
    throw new Error(error.message);
  }

  console.info(`[email] Sent "${subject}" to ${to_name} <${to_email}>`);
}

/**
 * Queue an email without blocking the caller. Failures are logged to the server console.
 */
export function queueEmail(params: SendEmailParams): void {
  console.info(`[email] Queuing "${params.subject}" to ${params.to_email}`);
  void sendEmail(params).catch((error) => {
    logEmailError('Failed to send', params, error);
  });
}
