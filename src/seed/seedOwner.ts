// src/seed/seedOwner.ts
import bcrypt from 'bcryptjs';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dreamize.rw';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seedAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL, role: 'admin' });
    if (existing) return;

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = new User({
      firstName: 'Dreamize',
      lastName: 'Admin',
      email: ADMIN_EMAIL,
      password: hashed,
      role: 'admin',
      status: 'active',
      isVerified: true,
      isActive: true,
    });
    await admin.save();
    console.log('Created Dreamize admin user');
  } catch (err) {
    console.error('Failed to seed admin:', err);
  }
}

// Execute immediately when imported
seedAdmin();
