import { queueEmail } from './emailService';

function formatSessionDateTime(date: Date): string {
  return date.toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
}

export function queueSessionApprovedEmails(params: {
  studentName: string;
  studentEmail: string;
  trainerName: string;
  trainerEmail: string;
  sessionTime: Date;
  durationMinutes: number;
  sessionFormat: 'online' | 'in-person';
  joinUrl?: string;
  startUrl?: string;
  location?: string;
  approvalNotes?: string;
  preparationRequirements?: string;
  nextSteps?: string;
}) {
  const when = `${formatSessionDateTime(params.sessionTime)} UTC`;
  const dashboardUrl = `${process.env.FRONTEND_URL?.trim() || 'http://localhost:3000'}/dashboard/student/calendar`;

  const sharedDetails = [
    `Session time: ${when}`,
    `Duration: ${params.durationMinutes} minutes`,
    `Format: ${params.sessionFormat === 'online' ? 'Online (Zoom)' : 'In-person'}`,
    params.approvalNotes ? `\nNotes from your trainer:\n${params.approvalNotes}` : '',
    params.preparationRequirements
      ? `\nPreparation:\n${params.preparationRequirements}`
      : '',
    params.nextSteps ? `\nNext steps:\n${params.nextSteps}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  if (params.sessionFormat === 'online' && params.joinUrl) {
    queueEmail({
      to_email: params.studentEmail,
      to_name: params.studentName,
      subject: 'Your Dreamize orientation session is confirmed',
      message: `Hi ${params.studentName},

Your orientation session with ${params.trainerName} has been approved.

${sharedDetails}

Join your Zoom session:
${params.joinUrl}

You can also find this link anytime in your dashboard:
${dashboardUrl}

See you there,
Dreamize Africa`,
    });

    queueEmail({
      to_email: params.trainerEmail,
      to_name: params.trainerName,
      subject: `Orientation session confirmed with ${params.studentName}`,
      message: `Hi ${params.trainerName},

You approved an orientation session with ${params.studentName}.

${sharedDetails}

Start the Zoom session (host link):
${params.startUrl || params.joinUrl}

Student join link:
${params.joinUrl}

Dreamize Africa`,
    });
    return;
  }

  queueEmail({
    to_email: params.studentEmail,
    to_name: params.studentName,
    subject: 'Your Dreamize orientation session is confirmed',
    message: `Hi ${params.studentName},

Your orientation session with ${params.trainerName} has been approved.

${sharedDetails}

Location:
${params.location}

View details in your dashboard:
${dashboardUrl}

Dreamize Africa`,
  });

  queueEmail({
    to_email: params.trainerEmail,
    to_name: params.trainerName,
    subject: `Orientation session confirmed with ${params.studentName}`,
    message: `Hi ${params.trainerName},

You approved an orientation session with ${params.studentName}.

${sharedDetails}

Location:
${params.location}

Dreamize Africa`,
  });
}
