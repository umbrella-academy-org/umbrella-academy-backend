import { Request, Response, NextFunction } from 'express';
import { StatsService } from '../services/statsService';
import { AdminService } from '../services/adminService';
import { CertificateService } from '../services/certificateService';

export class AdminController {
  // GET /api/admin/analytics - platform-wide stats
  static async getAnalytics(req: Request, res: Response, next: NextFunction) {
    try {
      const analytics = await StatsService.getPlatformAnalytics();
      
      res.json({
        success: true,
        data: analytics,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getAllCertificates(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const certificates = await CertificateService.getAllCertificates(search);
      res.json({ success: true, data: certificates });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/admin/trainers/pending - get pending trainer applications
  static async getPendingTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const pendingTrainers = await AdminService.getPendingTrainers();

      res.json({
        success: true,
        data: pendingTrainers
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/admin/trainers/:trainerId/approve - approve trainer application
  static async approveTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.trainerId as string;
      const adminId = req.user!.userId;

      const trainer = await AdminService.approveTrainer(trainerId, adminId);

      res.json({
        success: true,
        data: trainer,
        message: 'Trainer approved successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Trainer not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Trainer is not in pending status') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // POST /api/admin/trainers/:trainerId/reject - reject trainer application
  static async rejectTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.trainerId as string;
      const { rejectionReason } = req.body as { rejectionReason: string };
      const adminId = req.user!.userId;

      if (!rejectionReason) {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }

      const trainer = await AdminService.rejectTrainer(trainerId, adminId, rejectionReason);

      res.json({
        success: true,
        data: trainer,
        message: 'Trainer rejected successfully'
      });
    } catch (err) {
      if (err instanceof Error) {
        if (err.message === 'Trainer not found') {
          return res.status(404).json({ success: false, message: err.message });
        }
        if (err.message === 'Trainer is not in pending status') {
          return res.status(400).json({ success: false, message: err.message });
        }
      }
      next(err);
    }
  }

  // GET /api/admin/trainers - get all trainers with their approval status
  static async getAllTrainers(req: Request, res: Response, next: NextFunction) {
    try {
      const { status } = req.query as { status?: string };
      
      const trainers = await AdminService.getAllTrainers(status);

      res.json({
        success: true,
        data: trainers
      });
    } catch (err) {
      next(err);
    }
  }

  // DELETE /api/admin/trainers/:trainerId - delete trainer account (admin only)
  static async deleteTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerId = req.params.trainerId as string;

      await AdminService.deleteTrainer(trainerId);

      res.json({
        success: true,
        message: 'Trainer deleted successfully'
      });
    } catch (err) {
      if (err instanceof Error && err.message === 'Trainer not found') {
        return res.status(404).json({ success: false, message: err.message });
      }
      next(err);
    }
  }
}
