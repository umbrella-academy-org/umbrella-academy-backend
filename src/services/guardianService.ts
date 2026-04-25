import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { GuardianModel, StudentModel, Guardian, GuardianInviteState } from '../models/User';
import { sendEmail } from './emailService';

const INVITATION_TOKEN_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

interface InvitationTokenPayload {
  guardianId: string;
  studentId: string;
  type: 'guardian_invitation';
}

export class GuardianService {
  // Generate invitation token for guardian
  static generateInvitationToken(guardianId: string, studentId: string): string {
    const secret = process.env.JWT_SECRET as string;
    return jwt.sign(
      { guardianId, studentId, type: 'guardian_invitation' } as InvitationTokenPayload,
      secret,
      { expiresIn: '7d' }
    );
  }

  // Verify invitation token
  static verifyInvitationToken(token: string): InvitationTokenPayload | null {
    try {
      const secret = process.env.JWT_SECRET as string;
      const decoded = jwt.verify(token, secret) as InvitationTokenPayload;
      
      if (decoded.type !== 'guardian_invitation') {
        return null;
      }
      
      return decoded;
    } catch {
      return null;
    }
  }

  // Send guardian invitation email
  static async sendGuardianInvitation(
    guardianEmail: string,
    guardianName: string,
    studentName: string,
    invitationToken: string
  ): Promise<void> {
    const setPasswordUrl = `${process.env.FRONTEND_URL}/guardian/set-password?token=${invitationToken}`;
    
    await sendEmail({
      to_email: guardianEmail,
      to_name: guardianName,
      subject: "You've been invited as a Guardian on DREAMIZE-AFRICA",
      message: `Hello ${guardianName},

${studentName} has added you as their guardian on DREAMIZE-AFRICA to monitor their learning progress.

To get started, please set up your password by clicking the link below:

${setPasswordUrl}

This invitation link will expire in 7 days.

If you didn't expect this invitation, you can safely ignore this email.

Best regards,
The DREAMIZE-AFRICA Team`
    });
  }

  // Verify invitation and get guardian details
  static async verifyInvitation(token: string): Promise<{
    valid: boolean;
    guardian?: Guardian;
    studentName?: string;
    message?: string;
  }> {
    const payload = this.verifyInvitationToken(token);
    
    if (!payload) {
      return { valid: false, message: 'Invalid or expired invitation token' };
    }

    const guardian = await GuardianModel.findById(payload.guardianId);
    
    if (!guardian) {
      return { valid: false, message: 'Guardian account not found' };
    }

    if (guardian.inviteState === GuardianInviteState.ACTIVE) {
      return { valid: false, message: 'This invitation has already been accepted' };
    }

    if (guardian.inviteState === GuardianInviteState.DECLINED) {
      return { valid: false, message: 'This invitation has been declined' };
    }

    // Get student name
    const student = await StudentModel.findById(payload.studentId);
    const studentName = student ? `${student.firstName} ${student.lastName}` : 'Your student';

    return { 
      valid: true, 
      guardian, 
      studentName 
    };
  }

  // Set guardian password (accept invitation)
  static async setGuardianPassword(
    token: string, 
    password: string
  ): Promise<{
    success: boolean;
    message: string;
    token?: string;
  }> {
    // Validate password strength
    if (password.length < 8) {
      return { success: false, message: 'Password must be at least 8 characters long' };
    }

    const payload = this.verifyInvitationToken(token);
    
    if (!payload) {
      return { success: false, message: 'Invalid or expired invitation token' };
    }

    const guardian = await GuardianModel.findById(payload.guardianId);
    
    if (!guardian) {
      return { success: false, message: 'Guardian account not found' };
    }

    if (guardian.inviteState === GuardianInviteState.ACTIVE) {
      return { success: false, message: 'This invitation has already been accepted' };
    }

    // Hash password and update guardian
    const hashedPassword = await bcrypt.hash(password, 10);
    
    guardian.password = hashedPassword;
    guardian.inviteState = GuardianInviteState.ACTIVE;
    guardian.passwordSetAt = new Date();
    guardian.isVerified = true;
    
    await guardian.save();

    // Generate login token
    const loginToken = this.signGuardianToken(guardian._id.toString());

    return {
      success: true,
      message: 'Password set successfully. You can now log in.',
      token: loginToken
    };
  }

  // Sign JWT token for guardian
  static signGuardianToken(guardianId: string): string {
    const secret = process.env.JWT_SECRET as string;
    return jwt.sign(
      { userId: guardianId, role: 'guardian' },
      secret,
      { expiresIn: '7d' }
    );
  }

  // Guardian login
  static async login(email: string, password: string): Promise<{
    success: boolean;
    message: string;
    token?: string;
    user?: Guardian;
  }> {
    const guardian = await GuardianModel.findOne({ email: email.toLowerCase() });

    if (!guardian) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    // Check if guardian has set password (accepted invitation)
    if (guardian.inviteState !== GuardianInviteState.ACTIVE) {
      return {
        success: false,
        message: 'Please accept your invitation email and set a password before logging in.'
      };
    }

    const passwordMatch = await bcrypt.compare(password, guardian.password);
    
    if (!passwordMatch) {
      return {
        success: false,
        message: 'Invalid email or password.'
      };
    }

    const token = this.signGuardianToken(guardian._id.toString());

    return {
      success: true,
      message: 'Login successful',
      token,
      user: guardian
    };
  }

  // Get linked students for guardian
  static async getLinkedStudents(guardianId: string): Promise<{
    success: boolean;
    students?: any[];
    message?: string;
  }> {
    const guardian = await GuardianModel.findById(guardianId);

    if (!guardian) {
      return { success: false, message: 'Guardian not found' };
    }

    const students = await StudentModel.find({
      _id: { $in: guardian.linkedStudentIds }
    }).select('-password');

    return {
      success: true,
      students
    };
  }

  // Get single student details (for guardian dashboard)
  static async getStudentDetails(guardianId: string, studentId: string): Promise<{
    success: boolean;
    student?: any;
    message?: string;
  }> {
    const guardian = await GuardianModel.findById(guardianId);

    if (!guardian) {
      return { success: false, message: 'Guardian not found' };
    }

    // Verify this student is linked to the guardian
    if (!guardian.linkedStudentIds.includes(studentId as any)) {
      return { success: false, message: 'You do not have access to this student' };
    }

    const student = await StudentModel.findById(studentId).select('-password');

    if (!student) {
      return { success: false, message: 'Student not found' };
    }

    return {
      success: true,
      student
    };
  }

  // Resend invitation (in case original expired or was lost)
  static async resendInvitation(
    guardianId: string,
    studentId: string
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const guardian = await GuardianModel.findById(guardianId);
    
    if (!guardian) {
      return { success: false, message: 'Guardian not found' };
    }

    if (guardian.inviteState === GuardianInviteState.ACTIVE) {
      return { success: false, message: 'Guardian has already accepted the invitation' };
    }

    const student = await StudentModel.findById(studentId);
    
    if (!student) {
      return { success: false, message: 'Student not found' };
    }

    // Generate new token and send
    const invitationToken = this.generateInvitationToken(guardianId, studentId);
    
    await this.sendGuardianInvitation(
      guardian.email,
      guardian.firstName,
      `${student.firstName} ${student.lastName}`,
      invitationToken
    );

    // Update invite sent timestamp
    guardian.inviteSentAt = new Date();
    await guardian.save();

    return {
      success: true,
      message: 'Invitation resent successfully'
    };
  }

  // Decline invitation
  static async declineInvitation(token: string): Promise<{
    success: boolean;
    message: string;
  }> {
    const payload = this.verifyInvitationToken(token);
    
    if (!payload) {
      return { success: false, message: 'Invalid or expired invitation token' };
    }

    const guardian = await GuardianModel.findById(payload.guardianId);
    
    if (!guardian) {
      return { success: false, message: 'Guardian account not found' };
    }

    if (guardian.inviteState === GuardianInviteState.ACTIVE) {
      return { success: false, message: 'This invitation has already been accepted' };
    }

    guardian.inviteState = GuardianInviteState.DECLINED;
    await guardian.save();

    // Remove guardian reference from student
    await StudentModel.findByIdAndUpdate(payload.studentId, {
      $unset: { guardianId: 1 }
    });

    return {
      success: true,
      message: 'Invitation declined successfully'
    };
  }
}
