import emailjs from '@emailjs/nodejs';

// Single template ID for all transactional emails
export const EMAILJS_TEMPLATE_ID = process.env.EMAILJS_TEMPLATE_ID as string;

interface SendEmailParams {
  to_email: string;
  to_name: string;
  subject: string;
  message: string;
}

/**
 * Send an email via EmailJS using a single template.
 * OTP codes and reset tokens are NEVER returned from endpoints - only { success: true }.
 */
export async function sendEmail({
  to_email,
  to_name,
  subject,
  message,
}: SendEmailParams): Promise<void> {
  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID as string,
    EMAILJS_TEMPLATE_ID,
    {
      to_email,
      to_name,
      subject,
      message,
    },
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY as string,
      privateKey: process.env.EMAILJS_PRIVATE_KEY as string,
    }
  );
}
