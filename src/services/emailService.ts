import emailjs from '@emailjs/nodejs';

// Template ID constants — set these in your .env file
export const EMAILJS_TEMPLATE_OTP = process.env.EMAILJS_TEMPLATE_OTP as string;
export const EMAILJS_TEMPLATE_RESET_PASSWORD = process.env.EMAILJS_TEMPLATE_RESET_PASSWORD as string;
export const EMAILJS_TEMPLATE_TRAINER_APPROVED = process.env.EMAILJS_TEMPLATE_TRAINER_APPROVED as string;
export const EMAILJS_TEMPLATE_MENTOR_APPROVED = process.env.EMAILJS_TEMPLATE_MENTOR_APPROVED as string;

/**
 * Send an email via EmailJS.
 * OTP codes and reset tokens are NEVER returned from endpoints — only { success: true }.
 */
export async function sendEmail(
  templateId: string,
  templateParams: Record<string, string>
): Promise<void> {
  await emailjs.send(
    process.env.EMAILJS_SERVICE_ID as string,
    templateId,
    templateParams,
    {
      publicKey: process.env.EMAILJS_PUBLIC_KEY as string,
      privateKey: process.env.EMAILJS_PRIVATE_KEY as string,
    }
  );
}
