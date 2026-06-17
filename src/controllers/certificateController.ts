import { Request, Response, NextFunction } from 'express';
import { CertificateService } from '../services/certificateService';

export class CertificateController {
  static async getMyCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const certificates = await CertificateService.getStudentCertificates(userId);
      res.json({ success: true, data: certificates });
    } catch (err) {
      next(err);
    }
  }

  static async getCertificateById(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const certificateId = req.params.id as string;

      await CertificateService.assertCanAccessCertificate(certificateId, userId, role);
      const certificate = await CertificateService.getCertificateById(certificateId);

      res.json({ success: true, data: certificate });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Certificate not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied') {
          return res.status(403).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  static async viewCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const certificateId = req.params.id as string;

      const certificate = await CertificateService.assertCanAccessCertificate(
        certificateId,
        userId,
        role
      );

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send(CertificateService.renderCertificateHtml(certificate));
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Certificate not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied') {
          return res.status(403).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  static async downloadCertificate(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const role = req.user!.role;
      const certificateId = req.params.id as string;

      const certificate = await CertificateService.assertCanAccessCertificate(
        certificateId,
        userId,
        role
      );

      const pdfBuffer = await CertificateService.generateCertificatePdfBuffer(certificate);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${certificate.certificateNumber}.pdf"`
      );
      res.send(pdfBuffer);
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Certificate not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Access denied') {
          return res.status(403).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }
}
