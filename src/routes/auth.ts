import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User, { UserRole } from '../models/User';
import Wallet from '../models/Wallet';

const router = Router();

const VALID_ROLES: UserRole[] = ['student', 'trainer', 'mentor', 'field-admin', 'umbrella-admin'];

function signToken(userId: string, role: string, fieldId: string | undefined): string {
  const secret = process.env.JWT_SECRET as string;
  return jwt.sign({ userId, role, fieldId }, secret, { expiresIn: '7d' });
}

// POST /api/auth/register
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

// POST /api/auth/login
router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
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

export default router;
