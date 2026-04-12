import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { UserRole } from '../models/User';
import Wallet from '../models/Wallet';
import { authenticate, requireRole } from '../middleware/auth';
import { sendEmail } from '../services/emailService';

const router = Router();

const VALID_ROLES: UserRole[] = ['student', 'trainer', 'company-admin', 'umbrella-admin'];

function signToken(userId: string, role: string, fieldId: string | undefined): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ userId, role, fieldId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register/student
router.post('/register/student', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, firstName, lastName,
      gender, dateOfBirth, phoneCode, phoneNumber, educationLevel, fieldId,
      companyId
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'student',
      firstName,
      lastName,
      companyId: companyId || null,
      status: 'active',
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      phoneCode: phoneCode || undefined,
      phoneNumber: phoneNumber || undefined,
      educationLevel: educationLevel || undefined,
      fieldId: fieldId || null,
      isVerified: false,
    });

    const token = signToken(String(user._id), user.role, user.fieldId ? String(user.fieldId) : undefined);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fieldId: user.fieldId,
        status: user.status,
      },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    next(err);
  }
});

// POST /api/auth/register/trainer
router.post('/register/trainer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, firstName, lastName,
      bio, educationLevel, educationTitle, school, yearOfCompletion,
      fieldId, availability, proofDocuments,
      companyId
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'trainer',
      firstName,
      lastName,
      companyId: companyId || null,
      status: 'inactive',
      approvalStatus: 'pending',
      bio: bio || undefined,
      educationLevel: educationLevel || undefined,
      educationTitle: educationTitle || undefined,
      school: school || undefined,
      yearOfCompletion: yearOfCompletion || undefined,
      fieldId: fieldId || null,
      availability: availability || undefined,
      proofDocuments: proofDocuments || [],
      isVerified: false,
    });

    await Wallet.create({
      ownerId: user._id,
      ownerType: 'trainer',
      balance: 0,
      currency: 'RWF',
    });

    return res.status(201).json({ success: true, pending: true });
  } catch (err: any) {
    console.error(err);
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    next(err);
  }
});

// POST /api/auth/send-otp
router.post('/send-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error sending OTP:', err);
    next(err);
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, otp } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (!user || !user.otpCode || !user.otpExpiry) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    if (user.otpExpiry < new Date()) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    const isValid = await bcrypt.compare(otp, user.otpCode);
    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP' });
    }

    await User.findByIdAndUpdate(user._id, { $unset: { otpCode: 1, otpExpiry: 1 } }, { new: true });

    return res.status(200).json({ success: true, verified: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-otp
router.post('/resend-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });
    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

      await User.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('Error resending OTP:', err);
    next(err);
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000);

      await User.findByIdAndUpdate(user._id, { resetToken, resetTokenExpiry }, { new: true });

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

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { token, newPassword } = req.body;

    const user = await User.findOne({
      resetToken: token,
      resetTokenExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset token' });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(
      user._id,
      { password: hashedPassword, $unset: { resetToken: 1, resetTokenExpiry: 1 } },
      { new: true }
    );

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/auth/trainers/:id/approve
router.patch(
  '/trainers/:id/approve',
  authenticate,
  requireRole('company-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: 'approved', status: 'active' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
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

      return res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/trainers/:id/reject
router.post(
  '/trainers/:id/reject',
  authenticate,
  requireRole('company-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findById(req.params.id);

      if (!user || user.role !== 'trainer') {
        return res.status(404).json({ success: false, message: 'Trainer not found' });
      }

      const updatedUser = await User.findByIdAndUpdate(
        req.params.id,
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

      return res.status(200).json({ success: true, data: updatedUser });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      return res.status(403).json({ success: false, message: 'Your email is not verified. Please verify your email to login.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Block unapproved trainers
    if (
      user.role === 'trainer' &&
      user.approvalStatus !== null &&
      user.approvalStatus !== undefined &&
      user.approvalStatus !== 'approved'
    ) {
      return res.status(403).json({ success: false, message: 'Your application is pending approval.' });
    }

    const token = signToken(String(user._id), user.role, user.fieldId ? String(user.fieldId) : undefined);

    return res.status(200).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fieldId: user.fieldId,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/register — generic (backward compat)
router.post('/register', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password, role, firstName, lastName, fieldId } = req.body;

    if (!VALID_ROLES.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`,
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role,
      firstName,
      lastName,
      fieldId: fieldId || null,
    });

    if (role === 'trainer') {
      await Wallet.create({
        ownerId: user._id,
        ownerType: 'trainer',
        balance: 0,
        currency: 'RWF',
      });
    }

    const token = signToken(String(user._id), user.role, user.fieldId ? String(user.fieldId) : undefined);

    return res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        fieldId: user.fieldId,
        status: user.status,
      },
    });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({
        success: false,
        message: 'An account with this email already exists.',
      });
    }
    next(err);
  }
});

export default router;
