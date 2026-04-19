import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/authService';
import { ApiResponse } from '@/interfaces/api';
import { StudentRegister } from '@/interfaces/auth';

export class AuthController {
  // POST /api/auth/register/student
  static async registerStudent(req: Request, res: Response, next: NextFunction) {
    try {
      const studentData = req.body as unknown as StudentRegister;
      const response = await AuthService.registerStudent(studentData);
      return res.status(201).json(response);
    } catch (err: any) {
      if (err.code === 11000) {
        return res.status(200).json({ success: false, message: 'An account with this email already exists.' });
      }
      next(err);
    }
  }

  // POST /api/auth/register/trainer
  static async registerTrainer(req: Request, res: Response, next: NextFunction) {
    try {
      const trainerData = req.body;
      const response = await AuthService.registerTrainer(trainerData);
      return res.status(201).json(response);
    } catch (err: any) {
      console.error(err);
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
      }
      next(err);
    }
  }

  // POST /api/auth/send-otp
  static async sendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const response = await AuthService.sendOtp(email);
      return res.status(200).json(response);
    } catch (err) {
      console.error('Error sending OTP:', err);
      next(err);
    }
  }

  // POST /api/auth/verify-otp
  static async verifyOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, otp } = req.body;
      const response = await AuthService.verifyOtp(email, otp);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/resend-otp
  static async resendOtp(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const response = await AuthService.resendOtp(email);
      return res.status(200).json(response);
    } catch (err) {
      console.error('Error resending OTP:', err);
      next(err);
    }
  }

  // POST /api/auth/forgot-password
  static async forgotPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { email } = req.body;
      const response = await AuthService.forgotPassword(email);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // POST /api/auth/reset-password
  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const { token, newPassword } = req.body;
      const response = await AuthService.resetPassword(token, newPassword);
      
      if (!response.success) {
        return res.status(400).json(response);
      }
      
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }


  // POST /api/auth/login
  static async login(req: Request, res: Response, next: NextFunction) {
    try {
      const { email, password } = req.body;
      const response = await AuthService.login(email, password);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }

  // GET /api/auth/onboarding-checklist
  static async getOnboardingChecklist(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.userId;
      const response = await AuthService.getStudentOnboardingChecklist(userId);
      return res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}
