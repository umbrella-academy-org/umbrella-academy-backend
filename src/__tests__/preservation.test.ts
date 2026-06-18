/**
 * Preservation Property Tests
 *
 * PURPOSE: These tests encode the UNCHANGED behaviors that must NOT be broken by the fix.
 * They MUST PASS on unfixed code — passing confirms the baseline behavior we must preserve.
 * They must also PASS after the fix is applied (regression prevention).
 *
 * Validates: Requirements 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.7, 3.8
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

jest.mock('../models/Field', () => {
  const MockFieldModel: any = jest.fn().mockImplementation(() => ({}));
  MockFieldModel.schema = { post: jest.fn() };
  return { default: MockFieldModel, __esModule: true };
});

jest.mock('../services/socket', () => ({
  initSocket: jest.fn(),
}));

// ─── Mock emailService to avoid real EmailJS calls ──────────────────────────
jest.mock('../services/emailService', () => ({
  sendEmail: jest.fn().mockResolvedValue(undefined),
  queueEmail: jest.fn(),
  verifySmtpConnection: jest.fn().mockResolvedValue(true),
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

import express from 'express';
import request from 'supertest';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authRouter from '../routes/auth';
import { authenticate } from '../middleware/auth';

const JWT_SECRET = 'test-secret';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

// Build a minimal test app with just the auth router
const app = express();
app.use(express.json());
app.use('/api/auth', authRouter);

// A protected dummy endpoint to test auth middleware (Requirement 3.7, 3.8)
app.get('/api/protected', authenticate, (_req, res) => {
  res.status(200).json({ success: true, message: 'access granted' });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 1 — Login with valid credentials returns JWT + user + 200
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 1 — Login with valid credentials (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * For any valid role with correct credentials, login returns JWT + user object + 200 status.
   * This behavior must be unchanged by the fix.
   */
  const validRoles = ['student', 'trainer', 'company-admin', 'umbrella-admin'];

  it.each(validRoles)(
    'login with role "%s" and correct credentials returns 200 with token and user',
    async (role) => {
      const User = require('../models/User').default;
      const hashedPassword = await bcrypt.hash('Password123!', 10);

      User.findOne.mockResolvedValueOnce({
        _id: 'mock-user-id',
        firstName: 'Test',
        lastName: 'User',
        email: `${role}@example.com`,
        role,
        fieldId: null,
        status: 'active',
        isVerified: true,
        password: hashedPassword,
      });

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: `${role}@example.com`, password: 'Password123!' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(typeof res.body.token).toBe('string');
      expect(res.body.user).toBeDefined();
      expect(res.body.user.role).toBe(role);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 2 — Login response includes a token field
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 2 — Login returns JWT stored (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * The login response must include a `token` field (JWT string).
   * The frontend stores this as auth_token in localStorage.
   */
  it('login response body contains a non-empty token string', async () => {
    const User = require('../models/User').default;
    const hashedPassword = await bcrypt.hash('SecurePass!', 10);

    User.findOne.mockResolvedValueOnce({
      _id: 'mock-user-id',
      firstName: 'Alice',
      lastName: 'Smith',
      email: 'alice@example.com',
      role: 'student',
      fieldId: null,
      status: 'active',
      password: hashedPassword,
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'alice@example.com', password: 'SecurePass!' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeTruthy();
    expect(typeof res.body.token).toBe('string');
    // Verify it is a valid JWT (3 dot-separated parts)
    expect(res.body.token.split('.')).toHaveLength(3);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 3 — Login with wrong password returns 401
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 3 — Login with wrong password returns 401 (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * Invalid credentials must return 401 with a message.
   * Property: for all invalid credential combinations, response is always 401.
   */
  const invalidCombinations = [
    { email: 'user@example.com', password: 'wrongpassword', scenario: 'wrong password' },
    { email: 'nobody@example.com', password: 'anypassword', scenario: 'unknown email' },
    { email: 'user@example.com', password: '', scenario: 'empty password' },
  ];

  it.each(invalidCombinations)(
    'login with $scenario returns 401 with message',
    async ({ email, password, scenario: _scenario }) => {
      const User = require('../models/User').default;

      if (email === 'nobody@example.com') {
        // User not found
        User.findOne.mockResolvedValueOnce(null);
      } else {
        // User found but password does not match
        User.findOne.mockResolvedValueOnce({
          _id: 'mock-user-id',
          email,
          role: 'student',
          status: 'active',
          password: await bcrypt.hash('correctpassword', 10),
        });
      }

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message.length).toBeGreaterThan(0);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 4 — Register creates account and returns JWT
// Validates: Requirement 3.2
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 4 — Register creates account (Requirement 3.2)', () => {
  /**
   * Validates: Requirement 3.2
   * POST /api/auth/register with valid data creates a user and returns JWT.
   * This is the existing generic register endpoint — must continue to work.
   */
  it('POST /api/auth/register with valid data returns 201 with token and user', async () => {
    const User = require('../models/User').default;

    User.create.mockResolvedValueOnce({
      _id: 'new-user-id',
      firstName: 'Bob',
      lastName: 'Jones',
      email: 'bob@example.com',
      role: 'student',
      fieldId: null,
      status: 'active',
    });

    const res = await request(app)
      .post('/api/auth/register')
      .send({
        email: 'bob@example.com',
        password: 'Password123!',
        role: 'student',
        firstName: 'Bob',
        lastName: 'Jones',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.token).toBe('string');
    expect(res.body.user).toBeDefined();
    expect(res.body.user.email).toBe('bob@example.com');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 5 — 401 on invalid/missing token for protected endpoints
// Validates: Requirements 3.7, 3.8
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 5 — 401 on invalid token (Requirements 3.7, 3.8)', () => {
  /**
   * Validates: Requirements 3.7, 3.8
   * Authenticated endpoints return 401 when token is missing or invalid.
   * This ensures access control continues to be enforced.
   */
  const invalidTokenCases = [
    { label: 'no Authorization header', header: undefined },
    { label: 'malformed Bearer token', header: 'Bearer not.a.valid.token' },
    { label: 'Basic auth instead of Bearer', header: 'Basic dXNlcjpwYXNz' },
  ];

  it.each(invalidTokenCases)(
    'protected endpoint returns 401 with $label',
    async ({ header }) => {
      const req = request(app).get('/api/protected');
      if (header) {
        req.set('Authorization', header);
      }
      const res = await req;

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  );

  it('protected endpoint returns 200 with a valid JWT', async () => {
    const token = jwt.sign(
      { userId: 'u1', role: 'student' },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    const res = await request(app)
      .get('/api/protected')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 6 — All 5 valid roles are accepted by register endpoint
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 6 — Valid roles accepted by register (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * All 4 valid roles (student, trainer, company-admin, umbrella-admin)
   * are accepted by the register endpoint.
   */
  const validRoles = ['student', 'trainer', 'company-admin', 'umbrella-admin'];

  it.each(validRoles)(
    'POST /api/auth/register with role "%s" returns 201',
    async (role) => {
      const User = require('../models/User').default;
      const Wallet = require('../models/Wallet').default;

      User.create.mockResolvedValueOnce({
        _id: `user-${role}`,
        firstName: 'Test',
        lastName: 'User',
        email: `${role}-reg@example.com`,
        role,
        fieldId: null,
        status: 'active',
      });

      // Wallet.create is called for trainer role
      Wallet.create.mockResolvedValueOnce({});

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: `${role}-reg@example.com`,
          password: 'Password123!',
          role,
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Preservation 7 — Invalid role rejected with 400
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Preservation 7 — Invalid role rejected (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * A role not in the valid list returns 400.
   * This ensures the role validation gate is preserved.
   */
  const invalidRoles = ['wing-admin', 'superuser', 'admin', 'guest', ''];

  it.each(invalidRoles)(
    'POST /api/auth/register with role "%s" returns 400',
    async (role) => {
      const User = require('../models/User').default;
      User.create.mockClear();

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-role@example.com',
          password: 'Password123!',
          role,
          firstName: 'Test',
          lastName: 'User',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      // User.create should NOT have been called for invalid roles
      expect(User.create).not.toHaveBeenCalled();
    }
  );
});

// ─────────────────────────────────────────────────────────────────────────────
// Property-based: For all invalid credentials, response is always 401
// Validates: Requirement 3.1
// ─────────────────────────────────────────────────────────────────────────────
describe('Property — Invalid credentials always return 401 (Requirement 3.1)', () => {
  /**
   * Validates: Requirement 3.1
   * Frontend preservation: for any localStorage state, a 401 response removes only auth_token.
   * Backend side: verify that login with invalid credentials consistently returns 401
   * regardless of the email/password combination tried.
   *
   * Property: for all invalid credentials, response is always 401.
   */
  const invalidCredentialSets = [
    { email: 'a@b.com', password: 'wrong1' },
    { email: 'x@y.com', password: 'wrong2' },
    { email: 'test@test.com', password: 'badpass' },
    { email: 'foo@bar.com', password: '12345' },
    { email: 'nobody@nowhere.com', password: 'password' },
  ];

  it.each(invalidCredentialSets)(
    'login with email "$email" and wrong password always returns 401',
    async ({ email, password }) => {
      const User = require('../models/User').default;
      // Simulate user not found for all these combinations
      User.findOne.mockResolvedValueOnce(null);

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email, password });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    }
  );
});
