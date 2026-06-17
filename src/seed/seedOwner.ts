// src/seed/seedOwner.ts
import bcrypt from 'bcryptjs';
import { AdminModel } from '../models/User';
import dotenv from 'dotenv';

dotenv.config();

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@dreamize.rw';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'admin123';

async function seedAdmin() {
  try {
    const existing = await AdminModel.findOne({ email: ADMIN_EMAIL });
    if (existing) return;

    const hashed = await bcrypt.hash(ADMIN_PASSWORD, 10);
    const admin = new AdminModel({
      firstName: 'Dreamize',
      lastName: 'Admin',
      email: ADMIN_EMAIL,
      password: hashed,
      isVerified: true,
      isActive: true,
    });
    await admin.save();
    console.log('Created Dreamize Admin user');
  } catch (err) {
    console.error('Failed to seed admin:', err);
  }
}

// Execute immediately when imported
seedAdmin();
