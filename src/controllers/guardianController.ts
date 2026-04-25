import { Request, Response, NextFunction } from 'express';
import { GuardianService } from '../services/guardianService';

export class GuardianController {
  // POST /api/guardian/invite/verify - Verify invitation token
  static async verifyInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      const result = await GuardianService.verifyInvitation(token);

      if (!result.valid) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: {
          guardian: {
            email: result.guardian?.email,
            firstName: result.guardian?.firstName,
            lastName: result.guardian?.lastName
          },
          studentName: result.studentName
        },
        message: 'Invitation is valid'
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/guardian/set-password - Set password and accept invitation
  static async setPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, password } = req.body;

      if (!token || !password) {
        return res.status(400).json({
          success: false,
          message: 'Token and password are required'
        });
      }

      const result = await GuardianService.setGuardianPassword(token, password);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: { token: result.token },
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/guardian/login - Guardian login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      const result = await GuardianService.login(email.toLowerCase().trim(), password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: {
          token: result.token,
          user: result.user
        },
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/guardian/invite/decline - Decline invitation
  static async declineInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { token } = req.body;

      if (!token) {
        return res.status(400).json({
          success: false,
          message: 'Invitation token is required'
        });
      }

      const result = await GuardianService.declineInvitation(token);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/guardian/students - Get all linked students
  static async getLinkedStudents(req: Request, res: Response, next: NextFunction) {
    try {
      const guardianId = req.user!.userId;

      const result = await GuardianService.getLinkedStudents(guardianId);

      if (!result.success) {
        return res.status(404).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: result.students,
        count: result.students?.length || 0
      });
    } catch (err) {
      next(err);
    }
  }

  // GET /api/guardian/students/:studentId - Get specific student details
  static async getStudentDetails(req: Request, res: Response, next: NextFunction) {
    try {
      const guardianId = req.user!.userId;
      const studentId = typeof req.params.studentId === 'string' ? req.params.studentId : req.params.studentId[0];

      const result = await GuardianService.getStudentDetails(guardianId, studentId);

      if (!result.success) {
        return res.status(403).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        data: result.student
      });
    } catch (err) {
      next(err);
    }
  }

  // POST /api/guardian/invite/resend - Resend invitation (admin only)
  static async resendInvitation(req: Request, res: Response, next: NextFunction) {
    try {
      const { guardianId, studentId } = req.body;

      if (!guardianId || !studentId) {
        return res.status(400).json({
          success: false,
          message: 'Guardian ID and Student ID are required'
        });
      }

      const result = await GuardianService.resendInvitation(guardianId, studentId);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      res.json({
        success: true,
        message: result.message
      });
    } catch (err) {
      next(err);
    }
  }
}
