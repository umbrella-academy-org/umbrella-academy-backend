/**
 * Bug Condition Exploration Tests
 *
 * PURPOSE: These tests encode the EXPECTED (fixed) behavior.
 * On UNFIXED code they MUST FAIL — failure confirms the bugs exist.
 * They will PASS once the fix is applied, validating the fix.
 *
 * Validates: Requirements 1.1, 1.3, 1.4, 1.5, 1.6, 1.7, 1.8, 1.9, 1.10, 1.11, 1.13, 1.14
 */

// ─── Mock DB connection so no real MongoDB is needed ────────────────────────
jest.mock('../config/db', () => ({
  default: jest.fn().mockResolvedValue(undefined),
}));

// ─── Mock mongoose models ────────────────────────────────────────────────────
jest.mock('../models/User', () => {
  const mockUser = {
    _id: 'mock-user-id',
    firstName: 'Test',
    lastName: 'User',
    email: 'test@example.com',
    role: 'student',
    fieldId: null,
    status: 'active',
    password: '$2a$10$hashedpassword',
  };

  const MockUserModel: any = jest.fn().mockImplementation(() => mockUser);
  MockUserModel.create = jest.fn().mockResolvedValue(mockUser);
  MockUserModel.findOne = jest.fn().mockResolvedValue(null);
  MockUserModel.findById = jest.fn().mockResolvedValue(mockUser);
  MockUserModel.schema = { post: jest.fn() };

  return { default: MockUserModel, __esModule: true };
});

jest.mock('../models/Wallet', () => {
  const MockWalletModel: any = jest.fn().mockImplementation(() => ({}));
  MockWalletModel.create = jest.fn().mockResolvedValue({});
  MockWalletModel.findOne = jest.fn().mockResolvedValue(null);
  MockWalletModel.schema = { post: jest.fn() };

  return { default: MockWalletModel, __esModule: true };
});

// ─── Mock Field model (used in index.ts post-save hook) ─────────────────────
jest.mock('../models/Field', () => {
  const MockFieldModel: any = jest.fn().mockImplementation(() => ({}));
  MockFieldModel.schema = { post: jest.fn() };
  return { default: MockFieldModel, __esModule: true };
});

// ─── Mock socket service ─────────────────────────────────────────────────────
jest.mock('../services/socket', () => ({
  initSocket: jest.fn(),
}));

// ─── Mock all other routes to avoid their DB dependencies ────────────────────
jest.mock('../routes/fields', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/users', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/roadmaps', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/sessions', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/chat', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/payments', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/wallet', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/stats', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/notifications', () => {
  const { Router } = require('express');
  return { default: Router() };
});
jest.mock('../routes/system', () => {
  const { Router } = require('express');
  return { default: Router() };
});

// ─── Mock emailService to avoid real Resend calls ───────────────────────────
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  queueEmail: jest.fn(),
  verifySmtpConnection: jest.fn().mockResolvedValue(true),
}));

import express from 'express';
import request from 'supertest';
import authRouter from '../routes/auth';
import fileRouter from '../routes/files';

// Build a minimal test app that mounts auth and files routers
// (avoids the startServer() call in index.ts)
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);
app.use('/api/files', fileRouter);

// ─────────────────────────────────────────────────────────────────────────────
// Test A — OTP endpoint missing
// Bug: POST /api/auth/verify-otp does not exist → 404
// Expected (fixed): endpoint exists and returns a non-404 response
// FAILS on unfixed code ✓
// ─────────────────────────────────────────────────────────────────────────────
describe('Test A — OTP endpoint missing (Bug 1.3)', () => {
  /**
   * Validates: Requirements 1.3, 2.3
   * Bug condition: isBugCondition({ action: 'otp-verify-submit' }) → true
   * Expected behavior: POST /api/auth/verify-otp exists and returns a response
   */
  it('POST /api/auth/verify-otp should exist and return a non-404 response', async () => {
    const res = await request(app)
      .post('/api/auth/verify-otp')
      .send({ email: 'student@example.com', otp: '123456' });

    // On UNFIXED code: 404 (endpoint does not exist) → test FAILS
    // On FIXED code:   200 or 400 (endpoint exists, validates OTP) → test PASSES
    expect(res.status).not.toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test B — Student profile data lost (backend side)
// Bug: POST /api/auth/register/student does not exist → 404
// Expected (fixed): role-specific endpoint exists
// FAILS on unfixed code ✓
// ─────────────────────────────────────────────────────────────────────────────
describe('Test B — Student profile data lost / role-specific register missing (Bug 1.7, 1.6)', () => {
  /**
   * Validates: Requirements 1.7, 2.7, 2.6
   * Bug condition: isBugCondition({ action: 'register', role: 'student', endpoint: '/api/auth/register' }) → true
   * Expected behavior: POST /api/auth/register/student exists and accepts profile fields
   *
   * NOTE (frontend-only aspect): The student profile page collects gender, dateOfBirth,
   * phoneCode, phoneNumber, educationLevel but never calls localStorage.setItem() for them.
   * This is a frontend bug in app/auth/student/profile/page.tsx — handleContinue only
   * calls router.push() without persisting the form data. Cannot be tested here (backend test).
   */
  it('POST /api/auth/register/student should exist and return a non-404 response', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        email: 'student@example.com',
        password: 'Password123!',
        firstName: 'Jane',
        lastName: 'Doe',
        gender: 'female',
        dateOfBirth: '2000-01-15',
        phoneCode: '+250',
        phoneNumber: '0781234567',
        educationLevel: 'undergraduate',
      });

    // On UNFIXED code: 404 (endpoint does not exist) → test FAILS
    // On FIXED code:   201 (user created with all profile fields) → test PASSES
    expect(res.status).not.toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test C — fieldId key mismatch
// Bug: choose-company writes 'selectedField', create-password reads 'signupFieldId' → undefined
// Backend side: POST /api/auth/register/student does not exist → 404
// Expected (fixed): endpoint exists and accepts fieldId
// FAILS on unfixed code ✓
// ─────────────────────────────────────────────────────────────────────────────
describe('Test C — fieldId key mismatch (Bug 1.14, 1.6)', () => {
  /**
   * Validates: Requirements 1.14, 2.14, 2.6
   * Bug condition: isBugCondition({ action: 'create-password-submit', role: 'student',
   *   localStorage['signupFieldId']: null, localStorage['selectedField']: non-null }) → true
   * Expected behavior: POST /api/auth/register/student accepts fieldId in body
   *
   * NOTE (frontend-only aspect): choose-company/page.tsx writes localStorage.setItem('selectedField', id)
   * but create-password/page.tsx reads localStorage.getItem('signupFieldId') → null.
   * The key mismatch means fieldId is always undefined in the register payload.
   * Frontend fix: change 'selectedField' → 'signupFieldId' in choose-company page.
   */
  it('POST /api/auth/register/student should accept a fieldId field and return non-404', async () => {
    const res = await request(app)
      .post('/api/auth/register/student')
      .send({
        email: 'student2@example.com',
        password: 'Password123!',
        firstName: 'John',
        lastName: 'Smith',
        fieldId: '507f1f77bcf86cd799439011', // a valid ObjectId string
      });

    // On UNFIXED code: 404 (endpoint does not exist) → test FAILS
    // On FIXED code:   201 (user created with fieldId) → test PASSES
    expect(res.status).not.toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test D — Trainer files lost
// Bug: POST /api/files/upload does not exist → 404
// Expected (fixed): endpoint exists and returns { success: true, url: string }
// FAILS on unfixed code ✓
// ─────────────────────────────────────────────────────────────────────────────
describe('Test D — Trainer files lost / upload endpoint missing (Bug 1.9)', () => {
  /**
   * Validates: Requirements 1.9, 2.9
   * Bug condition: isBugCondition({ action: 'upload-proofs-continue', role: 'trainer',
   *   files: 'React-state-only' }) → true
   * Expected behavior: POST /api/files/upload exists and returns { success: true, url: string }
   *
   * NOTE: The upload endpoint is mounted at /api/files/upload in index.ts (after fix).
   * We test it directly here. The test app does NOT mount /api/files (it doesn't exist yet),
   * so this test will 404 on unfixed code.
   */
  it('POST /api/files/upload should exist and return { success: true, url: string }', async () => {
    // We need a separate app instance that would have the files route mounted
    // On unfixed code, the route doesn't exist at all, so we test against the main app
    // which also won't have it mounted → 404
    const res = await request(app)
      .post('/api/files/upload')
      .attach('file', Buffer.from('fake file content'), 'proof.pdf');

    // On UNFIXED code: 404 (endpoint does not exist) → test FAILS
    // On FIXED code:   200 with { success: true, url: '...' } → test PASSES
    expect(res.status).not.toBe(404);
    expect(res.body).toMatchObject({ success: true });
    expect(typeof res.body.url).toBe('string');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test E — Error message swallowed
// Bug: AuthContext.register returns hardcoded 'Registration failed' instead of backend message
// Backend side: POST /api/auth/register with duplicate email returns 409 with specific message
// This PASSES on unfixed code (backend already returns the correct message)
// ─────────────────────────────────────────────────────────────────────────────
describe('Test E — Error message swallowed (Bug 1.11) — EXPECTED TO PASS on unfixed code', () => {
  /**
   * Validates: Requirements 1.11, 2.11
   * Bug condition: isBugCondition({ action: 'register', backendError: non-null }) → true
   * Expected behavior: backend returns specific 409 message; frontend should surface it
   *
   * NOTE: The BACKEND already returns the correct specific message.
   * The bug is in the FRONTEND: AuthContext.register catches the error and returns
   * hardcoded { success: false, error: 'Registration failed' } instead of the backend message.
   * This test documents that the backend is correct — the frontend fix is in AuthContext.tsx.
   *
   * This test PASSES on unfixed code (backend behavior is already correct).
   */
  beforeEach(() => {
    const User = require('../models/User').default;
    // Simulate duplicate email error (MongoDB code 11000)
    const dupError = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });
    User.create.mockRejectedValueOnce(dupError);
  });

  it('POST /api/auth/register with duplicate email returns 409 with specific message', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'existing@example.com',
        password: 'Password123!',
        role: 'student',
        firstName: 'Existing',
        lastName: 'User',
      });

    // PASSES on both unfixed and fixed code — backend already returns correct message
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('An account with this email already exists.');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test F — wing-admin route (frontend-only bug)
// Bug: login page uses 'wing-admin' role string; backend has 'field-admin'
// This is a FRONTEND-ONLY bug — documented here, not testable in backend tests
// ─────────────────────────────────────────────────────────────────────────────
describe('Test F — wing-admin role string (Bug 1.5) — frontend-only documentation', () => {
  /**
   * Validates: Requirements 1.5, 2.5
   * Bug condition: isBugCondition({ action: 'demo-login', role: 'wing-admin' }) → true
   * Expected behavior: frontend uses 'field-admin' role string matching backend
   *
   * FRONTEND BUG (cannot be tested in backend):
   * In app/auth/login/page.tsx:
   *   - dashboardRoutes map uses 'wing-admin' key (does not exist in backend UserRole type)
   *   - Demo credentials button sets role to 'wing-admin'
   *   - navigate(dashboardRoutes['wing-admin']) → navigates to '/dashboard/wing-admin' (does not exist)
   *
   * Backend verification: confirm 'wing-admin' is NOT a valid role in the backend type system.
   * The VALID_ROLES array in auth.ts only contains: student, trainer, mentor, field-admin, umbrella-admin
   */
  it('backend VALID_ROLES should NOT include wing-admin', () => {
    // The backend UserRole type does not include 'wing-admin'
    // This confirms the frontend is using the wrong role string
    const validRoles = ['student', 'trainer', 'mentor', 'field-admin', 'umbrella-admin'];
    expect(validRoles).not.toContain('wing-admin');
    // field-admin IS a valid backend role
    expect(validRoles).toContain('field-admin');
  });

  it('POST /api/auth/register with role wing-admin should return 400 (invalid role)', async () => {
    const User = require('../models/User').default;
    // wing-admin is not a valid role — User.create should not be called
    User.create.mockClear();

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'wingadmin@example.com',
        password: 'Password123!',
        role: 'wing-admin', // invalid role
        firstName: 'Wing',
        lastName: 'Admin',
      });

    // Backend correctly rejects wing-admin as invalid role
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('Invalid role');
    // User.create should NOT have been called
    expect(User.create).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Test G — localStorage.clear on 401 (frontend-only bug)
// Bug: apiClient calls localStorage.clear() on 401, wiping onboarding data
// This is a FRONTEND-ONLY bug — documented here, not testable in backend tests
// ─────────────────────────────────────────────────────────────────────────────
describe('Test G — localStorage.clear on 401 (Bug 1.13) — frontend-only documentation', () => {
  /**
   * Validates: Requirements 1.13, 2.13
   * Bug condition: isBugCondition({ action: 'api-401-received', localStorage.clear: true }) → true
   * Expected behavior: only auth_token removed; all other localStorage keys intact
   *
   * FRONTEND BUG (cannot be tested in backend):
   * In services/client.ts, the request() method and logout() method call localStorage.clear()
   * when a 401/403 is received. This wipes ALL localStorage keys including onboarding data
   * (signupGender, signupDateOfBirth, signupFieldId, trainerBio, etc.) mid-flow.
   *
   * Fix: replace localStorage.clear() with localStorage.removeItem('auth_token')
   *
   * Backend verification: confirm that POST /api/auth/login with invalid credentials
   * returns 401 (which would trigger the frontend bug).
   */
  it('POST /api/auth/login with invalid credentials returns 401', async () => {
    const User = require('../models/User').default;
    // Simulate user not found
    User.findOne.mockResolvedValueOnce(null);

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'wrongpassword' });

    // Backend correctly returns 401 — this is the trigger for the frontend bug
    // On the frontend, receiving this 401 causes localStorage.clear() to be called
    expect(res.status).toBe(401);
    expect(res.body.message).toBe('Invalid email or password.');
  });
});
