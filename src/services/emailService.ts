import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
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

let transporter: Transporter | null = null;

function normalizeSmtpPassword(password: string): string {
  // Gmail app passwords are often copied with spaces — strip them.
  return password.replace(/\s+/g, '');
}

function getSmtpConfig() {
  const host = process.env.SMTP_HOST?.trim();
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const pass = process.env.SMTP_PASS
    ? normalizeSmtpPassword(process.env.SMTP_PASS.trim())
    : undefined;

  return { host, port, user, pass };
}

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const { host, port, user, pass } = getSmtpConfig();

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in backend/.env'
    );
  }

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === 'true' || port === 465,
    auth: { user, pass },
  });

  return transporter;
}

function getFromAddress(): string {
  return process.env.SMTP_FROM?.trim() || process.env.SMTP_USER?.trim() || 'noreply@dreamize.rw';
}

function logEmailError(action: string, params: SendEmailParams, error: unknown): void {
  const detail = error instanceof Error ? error.message : String(error);
  console.error(`[email] ${action} "${params.subject}" to ${params.to_email}: ${detail}`);
}

/**
 * Verify SMTP credentials on server startup.
 */
export async function verifySmtpConnection(): Promise<boolean> {
  const { host, user, pass } = getSmtpConfig();

  if (!host || !user || !pass) {
    console.warn('[email] SMTP not configured — emails will fail until backend/.env is set up.');
    return false;
  }

  try {
    await getTransporter().verify();
    console.info(`[email] SMTP ready (${user} via ${host})`);
    return true;
  } catch (error) {
    logEmailError('SMTP verify failed for', {
      to_email: user,
      to_name: 'SMTP',
      subject: 'connection test',
      message: '',
    }, error);
    return false;
  }
}

/**
 * Send an email via SMTP. OTP codes and reset tokens are never returned from endpoints.
 */
export async function sendEmail(params: SendEmailParams): Promise<void> {
  const { to_email, to_name, subject, message } = params;

  await getTransporter().sendMail({
    from: getFromAddress(),
    to: to_email,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
    replyTo: process.env.SMTP_REPLY_TO?.trim() || undefined,
  });

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
