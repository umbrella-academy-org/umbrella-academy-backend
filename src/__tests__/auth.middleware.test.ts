import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { authenticate, requireRole } from '../middleware/auth';

const JWT_SECRET = 'test-secret';

beforeAll(() => {
  process.env.JWT_SECRET = JWT_SECRET;
});

function makeRes() {
  const res = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  } as unknown as Response;
  return res;
}

function makeReq(authHeader?: string): Request {
  return {
    headers: authHeader ? { authorization: authHeader } : {},
  } as unknown as Request;
}

describe('authenticate', () => {
  it('returns 401 when Authorization header is missing', () => {
    const req = makeReq();
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when Authorization header does not start with Bearer', () => {
    const req = makeReq('Basic sometoken');
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is malformed', () => {
    const req = makeReq('Bearer not.a.valid.token');
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 401 when token is expired', () => {
    const token = jwt.sign(
      { userId: 'u1', role: 'student' },
      JWT_SECRET,
      { expiresIn: -1 }
    );
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it('attaches decoded user and calls next for a valid token', () => {
    const payload = { userId: 'u1', role: 'student', fieldId: 'f1' };
    const token = jwt.sign(payload, JWT_SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toMatchObject(payload);
  });

  it('attaches user without fieldId when not present in token', () => {
    const token = jwt.sign({ userId: 'u2', role: 'umbrella-admin' }, JWT_SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    authenticate(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user?.userId).toBe('u2');
    expect(req.user?.role).toBe('umbrella-admin');
  });
});

describe('requireRole', () => {
  function makeAuthedReq(role: string): Request {
    return { user: { userId: 'u1', role } } as unknown as Request;
  }

  it('calls next when role is allowed', () => {
    const req = makeAuthedReq('field-admin');
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    requireRole('field-admin', 'umbrella-admin')(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it('returns 403 when role is not in allowed list', () => {
    const req = makeAuthedReq('student');
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    requireRole('field-admin', 'umbrella-admin')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it('returns 403 when req.user is undefined', () => {
    const req = { headers: {} } as unknown as Request;
    const res = makeRes();
    const next = jest.fn() as NextFunction;

    requireRole('student')(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });
});
