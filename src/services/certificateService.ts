import { randomBytes } from 'crypto';
import PDFDocument from 'pdfkit';
import { CertificateModel, Certificate } from '../models/Certificate';
import { RoadmapModel } from '../models/Roadmap';
import { UserModel, GuardianModel } from '../models/User';

function generateCertificateNumber(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `DMZ-${Date.now().toString(36).toUpperCase()}-${suffix}`;
}

export class CertificateService {
  static formatCertificate(certificate: {
    _id: unknown;
    certificateNumber: string;
    student: string;
    studentName: string;
    roadmapId: string;
    milestoneId: string;
    milestoneName: string;
    trainer: string;
    trainerName: string;
    completionDate: Date;
    pdfUrl: string;
    createdAt?: Date;
    updatedAt?: Date;
  }) {
    return {
      _id: String(certificate._id),
      id: String(certificate._id),
      certificateNumber: certificate.certificateNumber,
      student: certificate.student,
      studentName: certificate.studentName,
      roadmapId: certificate.roadmapId,
      milestoneId: certificate.milestoneId,
      milestoneName: certificate.milestoneName,
      trainer: certificate.trainer,
      trainerName: certificate.trainerName,
      completionDate: certificate.completionDate,
      pdfUrl: certificate.pdfUrl,
      createdAt: certificate.createdAt,
      updatedAt: certificate.updatedAt,
    };
  }

  static async issueForMilestone(params: {
    roadmapId: string;
    milestoneOrder: number;
    studentId: string;
    trainerId: string;
  }) {
    const roadmap = await RoadmapModel.findById(params.roadmapId);
    if (!roadmap) return null;

    const milestone = roadmap.milestones.find((item) => item.order === params.milestoneOrder);
    if (!milestone) return null;

    const existing = await CertificateModel.findOne({
      student: params.studentId,
      roadmapId: params.roadmapId,
      milestoneId: String(params.milestoneOrder),
    });

    if (existing) {
      return existing;
    }

    const [student, trainer] = await Promise.all([
      UserModel.findById(params.studentId).select('firstName lastName'),
      UserModel.findById(params.trainerId).select('firstName lastName'),
    ]);

    const certificateNumber = generateCertificateNumber();
    const studentName = student ? `${student.firstName} ${student.lastName}`.trim() : 'Student';
    const trainerName = trainer ? `${trainer.firstName} ${trainer.lastName}`.trim() : 'Trainer';

    const certificate = await CertificateModel.create({
      certificateNumber,
      student: params.studentId,
      studentName,
      roadmapId: params.roadmapId,
      milestoneId: String(params.milestoneOrder),
      milestoneName: milestone.title,
      trainer: params.trainerId,
      trainerName,
      completionDate: new Date(),
      pdfUrl: '',
    });

    certificate.pdfUrl = `/api/certificates/${certificate._id.toString()}/download`;
    await certificate.save();

    try {
      const { NotificationService } = await import('./notificationService');
      await NotificationService.create({
        userId: params.studentId,
        title: 'Certificate issued',
        message: `You earned a certificate for completing "${milestone.title}".`,
        category: 'certificate',
        actionUrl: '/dashboard/student/certificates',
        relatedEntityId: certificate._id.toString(),
      });
    } catch (error) {
      console.warn('Failed to create certificate notification:', error);
    }

    return certificate;
  }

  static async getStudentCertificates(studentId: string) {
    const certificates = await CertificateModel.find({ student: studentId })
      .sort({ completionDate: -1 })
      .lean();

    return certificates.map((certificate) => this.formatCertificate(certificate));
  }

  static async getCertificateById(certificateId: string) {
    const certificate = await CertificateModel.findById(certificateId).lean();
    if (!certificate) return null;
    return this.formatCertificate(certificate);
  }

  static async assertCanAccessCertificate(
    certificateId: string,
    userId: string,
    role: string
  ) {
    const certificate = await CertificateModel.findById(certificateId);
    if (!certificate) {
      throw new Error('Certificate not found');
    }

    const studentId = String(certificate.student);
    const trainerId = String(certificate.trainer);

    if (role === 'admin') return certificate;
    if (role === 'student' && studentId === userId) return certificate;
    if (role === 'trainer' && trainerId === userId) return certificate;

    if (role === 'guardian') {
      const guardian = await GuardianModel.findById(userId);
      if (
        guardian &&
        guardian.linkedStudentIds.some((id) => String(id) === studentId)
      ) {
        return certificate;
      }
    }

    throw new Error('Access denied');
  }

  static generateCertificatePdfBuffer(certificate: Certificate): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 48 });
      const chunks: Buffer[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', reject);

      const completedOn = certificate.completionDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      doc.rect(36, 36, doc.page.width - 72, doc.page.height - 72).lineWidth(3).stroke('#cda429');

      doc.fillColor('#cda429').fontSize(10).text('DREAMIZE AFRICA', { align: 'center' });
      doc.moveDown(1.5);
      doc.fillColor('#111111').fontSize(28).text('Certificate of Completion', { align: 'center' });
      doc.moveDown();
      doc.fillColor('#666666').fontSize(12).text('This certifies that', { align: 'center' });
      doc.moveDown();
      doc.fillColor('#0f172a').fontSize(24).text(certificate.studentName, { align: 'center' });
      doc.moveDown();
      doc.fillColor('#666666').fontSize(12).text('has successfully completed the milestone', { align: 'center' });
      doc.moveDown();
      doc.fillColor('#334155').fontSize(18).text(certificate.milestoneName, { align: 'center' });
      doc.moveDown(2);

      const metaY = doc.y + 20;
      doc.fillColor('#475569').fontSize(10);
      doc.text(`Certificate No.\n${certificate.certificateNumber}`, 72, metaY);
      doc.text(`Verified By\n${certificate.trainerName}`, doc.page.width / 2 - 80, metaY, {
        width: 160,
        align: 'center',
      });
      doc.text(`Completed On\n${completedOn}`, doc.page.width - 220, metaY, {
        width: 160,
        align: 'right',
      });

      doc.end();
    });
  }

  static renderCertificateHtml(certificate: Certificate) {
    const completedOn = certificate.completionDate.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Certificate ${certificate.certificateNumber}</title>
  <style>
    body { font-family: Georgia, serif; background: #f8f6f0; margin: 0; padding: 40px; }
    .certificate { max-width: 900px; margin: 0 auto; background: white; border: 12px solid #cda429; padding: 48px; box-shadow: 0 20px 60px rgba(0,0,0,0.12); }
    .brand { text-align: center; color: #cda429; letter-spacing: 0.35em; font-size: 12px; text-transform: uppercase; }
    h1 { text-align: center; font-size: 42px; margin: 24px 0 8px; color: #111; }
    .subtitle { text-align: center; color: #666; margin-bottom: 32px; }
    .name { text-align: center; font-size: 34px; color: #0f172a; margin: 24px 0; }
    .milestone { text-align: center; font-size: 22px; color: #334155; margin-bottom: 32px; }
    .meta { display: flex; justify-content: space-between; margin-top: 48px; color: #475569; font-size: 14px; }
    .actions { text-align: center; margin-top: 32px; }
    button { background: #111; color: #cda429; border: none; padding: 12px 24px; border-radius: 999px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="certificate">
    <div class="brand">Dreamize Africa</div>
    <h1>Certificate of Completion</h1>
    <p class="subtitle">This certifies that</p>
    <div class="name">${certificate.studentName}</div>
    <p class="subtitle">has successfully completed the milestone</p>
    <div class="milestone">${certificate.milestoneName}</div>
    <div class="meta">
      <div><strong>Certificate No.</strong><br />${certificate.certificateNumber}</div>
      <div><strong>Verified By</strong><br />${certificate.trainerName}</div>
      <div><strong>Completed On</strong><br />${completedOn}</div>
    </div>
  </div>
  <div class="actions">
    <button onclick="window.print()">Print / Save as PDF</button>
  </div>
</body>
</html>`;
  }
}
