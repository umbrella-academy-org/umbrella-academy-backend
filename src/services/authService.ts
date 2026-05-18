import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { UserModel, GuardianModel, StudentModel, TrainerModel, OnboardingChecklist } from '../models/User';
import { sendEmail } from '../services/emailService';
import { GuardianService } from './guardianService';
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

    // Send guardian invitation email
    try {
      const invitationToken = GuardianService.generateInvitationToken(
        savedGuardian._id.toString(),
        savedStudent._id.toString()
      );

      await this.sendOtp(savedStudent.email)

      await GuardianService.sendGuardianInvitation(
        savedGuardian.email,
        savedGuardian.firstName,
        `${savedStudent.firstName} ${savedStudent.lastName}`,
        invitationToken
      );


    } catch (error) {
      // Log error but don't fail registration if email fails
      console.warn('Failed to send guardian invitation and student otp email:', error);
    }

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
    console.log(email)
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
    const user = await UserModel.findOne({ email: email?.toLowerCase() });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      const w = await UserModel.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });
      console.log(bcrypt.compareSync(otp, hashedOtp))
      try {
        await sendEmail({
          to_email: email,
          to_name: user.firstName || 'User',
          subject: 'Your Dreamize Verification Code',
          message: `Your verification code is: ${otp}\n\nThis code expiresn in 10 minutes. Do not share it with anyone.`
        });
      } catch (error) {
        console.error('Error sending OTP', error);
      }
    }
    console.log("How how")

    return { success: true };
  }

  static async forgotPassword(email: string) {
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
          subject: 'Reset Your Dreamize Password',
          message: `Your password reset code is: ${otp}\n\nThis code expires in 10 minutes.`
        });
      } catch {
        // ignore
      }
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

      await GuardianService.sendGuardianInvitation(
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
