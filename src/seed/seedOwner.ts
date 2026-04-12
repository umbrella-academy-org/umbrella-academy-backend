// src/seed/seedOwner.ts
import bcrypt from 'bcryptjs';
import User from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@umbrella.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seedAdmin() {
  try {
    const existing = await User.findOne({ email: ADMIN_EMAIL, role: 'umbrella-admin' });
    if (existing) {
      console.log('✅ Umbrella admin already exists');
      return;
    }
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = new User({
      firstName: 'Umbrella',
      lastName: 'Admin',
      email: ADMIN_EMAIL,
      password: hashed,
      role: 'umbrella-admin',
      status: 'active',
      isVerified: true,
    });
    await admin.save();
    console.log('🚀 Created umbrella admin user');
  } catch (err) {
    console.error('Failed to seed umbrella admin:', err);
  }
}

// Execute immediately when imported
seedAdmin();
