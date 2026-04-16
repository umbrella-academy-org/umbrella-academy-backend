import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel, GuardianModel, StudentModel, TrainerModel, OnboardingChecklist } from '../models/User';
import { sendEmail } from '../services/emailService';
import { ApiResponse } from '@/interfaces/api';
import { StudentRegister } from '@/interfaces/auth';

export class AuthService {
  static signToken(userId: string, role: string): string {
    const secret = process.env.JWT_SECRET as string;
    return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
  }

  static async registerStudent(studentData: StudentRegister) {
    const { guardianName, guardianEmail, guardianPhoneNumber, ...studentInfo } = studentData;
    const student = studentInfo as any;

    const hashedPassword = await bcrypt.hash(student.password, 10);
    student.password = hashedPassword;

    const guardian = {
      firstName: guardianName,
      email: guardianEmail,
      phoneNumber: guardianPhoneNumber,
      lastName: "unknown",
      password: "unknown",
    };

    const savedGuardian = await GuardianModel.create(guardian);
    student.guardianId = savedGuardian.id;
    const savedStudent = await StudentModel.create(student);
    savedGuardian.linkedStudentIds.push(savedStudent.id);
    await savedGuardian.save();

    const token = AuthService.signToken(String(savedStudent._id), savedStudent.role);

    return {
      success: true,
      message: "Student registered successfully",
      data: {
        token,
        user: savedStudent.toJSON()
      }
    } as ApiResponse;
  }

  static async registerTrainer(trainerData: any) {
    const trainer = trainerData;
    const hashedPassword = await bcrypt.hash(trainer.password, 10);
    trainer.password = hashedPassword;

    const savedTrainer = await TrainerModel.create(trainer);
    const token = AuthService.signToken(String(savedTrainer._id), savedTrainer.role);

    return {
      success: true,
      message: "Trainer registered successfully",
      data: {
        token,
        user: savedTrainer.toJSON()
      }
    } as ApiResponse;
  }

  static async sendOtp(email: string) {
    const user = await UserModel.findOne({ email: email?.toLowerCase() });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await UserModel.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

      try {
        await sendEmail({
          to_email: email,
          to_name: user.firstName || 'User',
          subject: 'Your Dreamize Verification Code',
          message: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`
        });
      } catch (error) {
        console.error('Error sending OTP', error);
      }
    }

    return { success: true };
  }

  static async verifyOtp(email: string, otp: string) {
    const user = await UserModel.findOne({ email: email?.toLowerCase() });

    if (!user || !user.otpCode || !user.otpExpiry) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    if (user.otpExpiry < new Date()) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    const isValid = await bcrypt.compare(otp, user.otpCode);
    if (!isValid) {
      return { success: false, message: 'Invalid or expired OTP' };
    }

    await UserModel.findByIdAndUpdate(user._id, { $unset: { otpCode: 1, otpExpiry: 1 }, isVerified: true }, { new: true });

    return { success: true, verified: true };
  }

  static async resendOtp(email: string) {
    const user = await UserModel.findOne({ email: email?.toLowerCase() });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await UserModel.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

      try {
        await sendEmail({
          to_email: email,
          to_name: user.firstName || 'User',
          subject: 'Your Dreamize Verification Code',
          message: `Your verification code is: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`
        });
      } catch {
        console.error('Error sending OTP');
      }
    }

    return { success: true };
  }

  static async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email?.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await UserModel.findByIdAndUpdate(user._id, { resetToken, resetTokenExpiry }, { new: true });

      try {
        await sendEmail({
          to_email: email,
          to_name: user.firstName || 'User',
          subject: 'Reset Your Dreamize Password',
          message: `Your password reset code is: ${resetToken}\n\nThis code expires in 10 minutes.`
        });
      } catch {
        // ignore
      }
    }

    return { success: true };
  }

  static async resetPassword(token: string, newPassword: string) {
    const user = await UserModel.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return { success: false, message: 'Invalid or expired reset token' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.findByIdAndUpdate(
      user._id,
      { password: hashedPassword, $unset: { resetToken: 1, resetTokenExpiry: 1 } },
      { new: true }
    );

    return { success: true };
  }

  static async approveTrainer(trainerId: string) {
    const user = await UserModel.findByIdAndUpdate(
      trainerId,
      { approvalStatus: 'approved', status: 'active' },
      { new: true }
    );

    if (!user) {
      return { success: false, message: 'Trainer not found' };
    }

    try {
      await sendEmail({
        to_email: user.email,
        to_name: user.firstName,
        subject: 'Your Trainer Application Has Been Approved',
        message: `Congratulations! Your trainer application has been approved. You can now log in at: ${process.env.FRONTEND_URL}/login`
      });
    } catch {
      // ignore
    }

    return { success: true, user };
  }

  static async rejectTrainer(trainerId: string) {
    const user = await UserModel.findById(trainerId);

    if (!user || user.role !== 'trainer') {
      return { success: false, message: 'Trainer not found' };
    }

    const updatedUser = await UserModel.findByIdAndUpdate(
      trainerId,
      { approvalStatus: 'rejected', status: 'inactive' },
      { new: true }
    );

    try {
      await sendEmail({
        to_email: user.email,
        to_name: user.firstName,
        subject: 'Your Trainer Application Has Been Rejected',
        message: `We regret to inform you that your trainer application has not been approved at this time.`
      });
    } catch {
      // ignore
    }

    return { success: true, data: updatedUser };
  }

  static async login(email: string, password: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    if (!user.isVerified) {
      return {
        success: false,
        message: 'Your email is not verified. Please verify your email to login.'
      };
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    // Block unapproved trainers
    if (user instanceof TrainerModel && user.approvalStatus !== 'approved') {
      return {
        success: false,
        message: 'Your application is pending approval.'
      };
    }

    const token = AuthService.signToken(String(user._id), user.role);

    return {
      success: true,
      message: "Login successful",
      data: {
        token,
        user
      }
    } as ApiResponse;
  }

  static async getStudentOnboardingChecklist(userId: string) {
    const user = await StudentModel.findById(userId);

    if (!user) {
      return {
        success: false,
        message: 'User not found'
      };
    }
    const response: OnboardingChecklist = {
      accountCreated: true,
      bookingPayed: user.hasPaidOrientation,
      subscriptionPayed: user.hasActiveSubscription,
      orientationBooked: user.onboardingStatus.orientationBooked,
      roadmapReceived: user.onboardingStatus.roadmapReceived,
      learningStarted: user.onboardingStatus.learningStarted
    }

    return {
      success: true,
      message: 'Dashboard retrieved successfully',
      data: response
    } as ApiResponse;
  }
}
