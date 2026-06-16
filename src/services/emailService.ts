import nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';

export interface SendEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) {
    throw new Error(
      'SMTP is not configured. Set SMTP_HOST, SMTP_USER, and SMTP_PASS in your environment.'
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
  return process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@dreamize.rw';
}

/**
 * Send an email via SMTP. OTP codes and reset tokens are never returned from endpoints.
 */
export async function sendEmail({
  to_email,
  to_name,
  subject,
  message,
}: SendEmailParams): Promise<void> {
  await getTransporter().sendMail({
    from: getFromAddress(),
    to: to_email,
    subject,
    text: message,
    html: message.replace(/\n/g, '<br>'),
    replyTo: process.env.SMTP_REPLY_TO || undefined,
  });

  if (process.env.NODE_ENV !== 'production') {
    console.info(`[email] Sent "${subject}" to ${to_name} <${to_email}>`);
  }
}

/**
 * Queue an email without blocking the caller. Failures are logged only.
 */
export function queueEmail(params: SendEmailParams): void {
  void sendEmail(params).catch((error) => {
    console.error(
      `[email] Failed to send "${params.subject}" to ${params.to_email}:`,
      error instanceof Error ? error.message : error
    );
  });
}
