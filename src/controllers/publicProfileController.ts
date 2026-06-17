import { Request, Response, NextFunction } from 'express';
import { PublicProfileService } from '../services/publicProfileService';

export class PublicProfileController {
  static async getStudentProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const identifier = req.params.identifier as string;
      const profile = await PublicProfileService.getPublicProfile(identifier);

      if (!profile) {
        return res.status(404).json({
          success: false,
          message: 'Public profile not found or not enabled',
        });
      }

      res.json({ success: true, data: profile });
    } catch (err) {
      next(err);
    }
  }
}
