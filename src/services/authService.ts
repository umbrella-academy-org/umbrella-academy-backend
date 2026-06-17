import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { UserModel, GuardianModel, StudentModel, TrainerModel, OnboardingChecklist, UserRole, Guardian } from '../models/User';
import { queueEmail } from '../services/emailService';
import { GuardianService } from './guardianService';
import { ApiResponse } from '@/interfaces/api';
import { StudentRegister } from '@/interfaces/auth';

export class AuthService {
  static signToken(userId: string, role: string): string {
    const secret = process.env.JWT_SECRET as string;
    return jwt.sign({ userId, role }, secret, { expiresIn: '7d' });
  }

  static requiresGuardian(ageRange?: string) {
    return ageRange === 'under-13' || ageRange === '13-17';
  }

  static async registerStudent(studentData: StudentRegister) {
    const {
      guardianName,
      guardianEmail,
      guardianPhoneNumber,
      guardianRelationship,
      ageRange,
      ...studentInfo
    } = studentData;
    const student = studentInfo as Record<string, unknown>;

    const hasGuardianDetails = Boolean(guardianEmail?.trim());
    if (AuthService.requiresGuardian(ageRange) && !hasGuardianDetails) {
      throw new Error('Guardian information is required for students under 18');
    }

    if (hasGuardianDetails && (!guardianName?.trim() || !guardianEmail?.trim())) {
      throw new Error('Guardian name and email are required when adding a guardian');
    }

    const hashedPassword = await bcrypt.hash(String(student.password), 10);
    student.password = hashedPassword;
    if (ageRange) {
      student.ageRange = ageRange;
    }

    let savedGuardian: Guardian | null = null;
    if (hasGuardianDetails) {
      savedGuardian = await GuardianModel.create({
        firstName: guardianName!.trim(),
        email: guardianEmail!.trim().toLowerCase(),
        phoneNumber: guardianPhoneNumber?.trim() || '',
        lastName: 'Guardian',
        password: 'pending-invite',
        role: UserRole.GUARDIAN,
      });
      student.guardianId = savedGuardian._id;
      student.guardianRelationship = guardianRelationship?.trim() || null;
    }

    const savedStudent = await StudentModel.create(student);

    if (savedGuardian) {
      savedGuardian.linkedStudentIds.push(savedStudent._id.toString());
      await savedGuardian.save();

      try {
        const invitationToken = GuardianService.generateInvitationToken(
          savedGuardian._id.toString(),
          savedStudent._id.toString()
        );

        GuardianService.sendGuardianInvitation(
          savedGuardian.email,
          savedGuardian.firstName,
          `${savedStudent.firstName} ${savedStudent.lastName}`,
          invitationToken
        );
      } catch (error) {
        console.warn('Failed to queue guardian invitation email:', error);
      }
    }

    try {
      await AuthService.issueOtpForEmail(savedStudent.email);
    } catch (error) {
      console.warn('Failed to queue student OTP email:', error);
    }

    try {
      const { SalesLeadService } = await import('./salesLeadService');
      await SalesLeadService.upsertFromStudent(savedStudent);
    } catch (error) {
      console.warn('Failed to create sales lead:', error);
    }

    const token = AuthService.signToken(String(savedStudent._id), savedStudent.role);

    return {
      success: true,
      message: 'Student registered successfully',
      data: {
        token,
        user: savedStudent.toJSON(),
      },
    } as ApiResponse;
  }

  static async registerTrainer(trainerData: any) {
    const trainer = trainerData;
    const hashedPassword = await bcrypt.hash(trainer.password, 10);
    trainer.password = hashedPassword;

    const savedTrainer = await TrainerModel.create(trainer);
    await AuthService.issueOtpForEmail(savedTrainer.email);
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

  private static async issueOtpForEmail(
    email: string,
    subject = 'Your Dreamize Verification Code',
    messagePrefix = 'Your verification code is'
  ): Promise<void> {
    const normalizedEmail = email?.toLowerCase().trim();
    if (!normalizedEmail) {
      console.warn('[auth] Cannot send OTP — email address is missing');
      return;
    }

    const user = await UserModel.findOne({ email: normalizedEmail });
    if (!user) {
      console.warn(`[auth] Cannot send OTP — no user found for ${normalizedEmail}`);
      return;
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

    await UserModel.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

    if (process.env.EMAIL_DEBUG === 'true') {
      console.info(`[auth][debug] OTP for ${normalizedEmail}: ${otp}`);
    }

    queueEmail({
      to_email: normalizedEmail,
      to_name: user.firstName || 'User',
      subject,
      message: `${messagePrefix}: ${otp}\n\nThis code expires in 10 minutes. Do not share it with anyone.`,
    });
  }

  static async sendOtp(email: string) {
    await AuthService.issueOtpForEmail(email);
    return { success: true };
  }

  static async verifyOtp(email: string, otp: string) {
    const normalizedEmail = email?.toLowerCase().trim();
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) {
      return { success: false, message: 'No account found for this email.' };
    }

    if (user.isVerified) {
      return {
        success: true,
        message: 'Email already verified.',
        data: {
          user: user.toJSON(),
          token: this.signToken(String(user._id), user.role),
        },
      };
    }

    if (!user.otpCode || !user.otpExpiry) {
      return { success: false, message: 'Invalid or expired OTP. Please request a new code.' };
    }

    if (user.otpExpiry < new Date()) {
      return { success: false, message: 'Invalid or expired OTP. Please request a new code.' };
    }

    const isValid = await bcrypt.compare(otp, user.otpCode);

    if (!isValid) {
      return { success: false, message: 'Incorrect verification code. Please try again.' };
    }

    const savedUser = await UserModel.findByIdAndUpdate(user._id, { $unset: { otpCode: 1, otpExpiry: 1 }, isVerified: true }, { new: true });

    return {
      success: true,
      data: {
        user: savedUser?.toJSON(),
        token: this.signToken(String(user._id), user.role)
      }
    }
  };


  static async resendOtp(email: string) {
    await AuthService.issueOtpForEmail(email);
    return { success: true };
  }

  static async forgotPassword(email: string) {
    const user = await UserModel.findOne({ email: email?.toLowerCase() });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await UserModel.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

      queueEmail({
        to_email: email,
        to_name: user.firstName || 'User',
        subject: 'Reset Your Dreamize Password',
        message: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`,
      });
    }

    return { success: true };
  }

  static async resetPassword(userId: string, newPassword: string) {
    const user = await UserModel.findOne({
      _id: userId
    });

    if (!user) {
      return { success: false, message: 'Invalid or expired reset token' };
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await UserModel.findByIdAndUpdate(
      user._id,
      { password: hashedPassword, $unset: { otpCode: 1, otpExpiry: 1 } },
      { new: true }
    );

    return { success: true };
  }


  static async login(email: string, password: string) {
    const user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    if (user instanceof GuardianModel && !user.isVerified) {
      const invitationToken = GuardianService.generateInvitationToken(
        user._id.toString(),
        user._id.toString()
      );

      const student = await StudentModel.findById(user.linkedStudentIds[0]);
      if (!student) {
        return {
          success: false,
          message: 'Linked student not found. Please contact support.'
        };
      }

      GuardianService.sendGuardianInvitation(
        user.email,
        user.firstName,
        `${student.firstName} ${student.lastName}`,
        invitationToken
      );
      return {
        success: true,
        message: 'Your email is not verified. We have resent the invitation email. Please check your inbox and verify your email to login.',
        data: {
          user,

        }

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

    const token = this.signToken(String(user._id), user.role);

    // Block unapproved trainers
    if (user instanceof TrainerModel && user.approvalStatus !== 'approved') {
      return {
        success: true,
        message: 'Your application is pending approval.',
        data: {
          user,
          token
        }
      };
    }

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
