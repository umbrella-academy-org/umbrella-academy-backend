import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User, { UserRole } from '../models/User';
import Wallet from '../models/Wallet';
import { authenticate, requireRole } from '../middleware/auth';
import {
  sendEmail,
  EMAILJS_TEMPLATE_OTP,
  EMAILJS_TEMPLATE_RESET_PASSWORD,
  EMAILJS_TEMPLATE_TRAINER_APPROVED,
  EMAILJS_TEMPLATE_MENTOR_APPROVED,
} from '../services/emailService';

const router = Router();

const VALID_ROLES: UserRole[] = ['student', 'trainer', 'mentor', 'field-admin', 'umbrella-admin'];

function signToken(userId: string, role: string, fieldId: string | undefined): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ userId, role, fieldId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register/student (Task 5)
router.post('/register/student', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, firstName, lastName,
      gender, dateOfBirth, phoneCode, phoneNumber, educationLevel, fieldId,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'student',
      firstName,
      lastName,
      status: 'active',
      gender: gender || undefined,
      dateOfBirth: dateOfBirth || undefined,
      phoneCode: phoneCode || undefined,
      phoneNumber: phoneNumber || undefined,
      educationLevel: educationLevel || undefined,
      fieldId: fieldId || null,
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

// POST /api/auth/register/trainer (Task 6)
router.post('/register/trainer', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, firstName, lastName,
      bio, educationLevel, educationTitle, school, yearOfCompletion,
      fieldId, availability, proofDocuments,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'trainer',
      firstName,
      lastName,
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
    });

    // Auto-create Wallet for trainer (preserves existing behavior)
    await Wallet.create({
      ownerId: user._id,
      ownerType: 'trainer',
      balance: 0,
      currency: 'RWF',
    });

    return res.status(201).json({ success: true, pending: true });
  } catch (err: any) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    next(err);
  }
});

// POST /api/auth/register/mentor (Task 7)
router.post('/register/mentor', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const {
      email, password, firstName, lastName,
      bio, educationLevel, educationTitle, school, yearOfCompletion, fieldId, expertise,
    } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      role: 'mentor',
      firstName,
      lastName,
      status: 'active',
      bio: bio || undefined,
      educationLevel: educationLevel || undefined,
      educationTitle: educationTitle || undefined,
      school: school || undefined,
      yearOfCompletion: yearOfCompletion || undefined,
      fieldId: fieldId || null,
      expertise: expertise || [],
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

// POST /api/auth/send-otp (Task 8)
router.post('/send-otp', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (user) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const hashedOtp = await bcrypt.hash(otp, 10);
      const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      await User.findByIdAndUpdate(user._id, { otpCode: hashedOtp, otpExpiry }, { new: true });

      try {
        await sendEmail(EMAILJS_TEMPLATE_OTP, { to_email: email, otp_code: otp });
      } catch {
        // Don't fail the request if email sending fails
      }
    }

    // Always return success — don't leak user existence
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/verify-otp (Task 9)
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

    // Clear OTP fields
    await User.findByIdAndUpdate(user._id, { $unset: { otpCode: 1, otpExpiry: 1 } }, { new: true });

    return res.status(200).json({ success: true, verified: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/resend-otp (Task 10)
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
        await sendEmail(EMAILJS_TEMPLATE_OTP, { to_email: email, otp_code: otp });
      } catch {
        // Don't fail the request if email sending fails
      }
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/forgot-password (Task 11)
router.post('/forgot-password', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email: email?.toLowerCase() });

    if (user) {
      const resetToken = crypto.randomUUID();
      const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await User.findByIdAndUpdate(user._id, { resetToken, resetTokenExpiry }, { new: true });

      try {
        await sendEmail(EMAILJS_TEMPLATE_RESET_PASSWORD, { to_email: email, reset_token: resetToken });
      } catch {
        // Don't fail the request if email sending fails
      }
    }

    // Always return success — don't leak user existence
    return res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
});

// POST /api/auth/reset-password (Task 12)
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

// PATCH /api/auth/trainers/:id/approve (Task 13)
router.patch(
  '/trainers/:id/approve',
  authenticate,
  requireRole('mentor', 'field-admin', 'umbrella-admin'),
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
        await sendEmail(EMAILJS_TEMPLATE_TRAINER_APPROVED, {
          to_email: user.email,
          first_name: user.firstName,
        });
      } catch {
        // Don't fail the request if email sending fails
      }

      return res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
);

// PATCH /api/auth/mentors/:id/approve (Task 14)
router.patch(
  '/mentors/:id/approve',
  authenticate,
  requireRole('field-admin', 'umbrella-admin'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const user = await User.findByIdAndUpdate(
        req.params.id,
        { approvalStatus: 'approved', status: 'active' },
        { new: true }
      );

      if (!user) {
        return res.status(404).json({ success: false, message: 'Mentor not found' });
      }

      try {
        await sendEmail(EMAILJS_TEMPLATE_MENTOR_APPROVED, {
          to_email: user.email,
          first_name: user.firstName,
        });
      } catch {
        // Don't fail the request if email sending fails
      }

      return res.status(200).json({ success: true, user });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/auth/login (Task 16 — updated with approval check)
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    // Block unapproved trainers/mentors (Task 16)
    if (
      (user.role === 'trainer' || user.role === 'mentor') &&
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

// POST /api/auth/register (Task 17 — kept for backward compatibility with preservation tests)
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

    // Auto-create Wallet for trainer (Requirement 7.4)
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
