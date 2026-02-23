/**
 * Unit tests for Auth Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { createAuthRoutes } from '../../../../src/api/routes/auth.routes.js';
import { userRepository } from '../../../../src/db/repositories/user.repository.js';
import { accountRepository } from '../../../../src/db/repositories/account.repository.js';
import { getSessionRepository } from '../../../../src/db/repositories/session.repository.js';
import { hashPassword, comparePassword, validatePassword } from '../../../../src/utils/crypto.js';

vi.mock('../../../../src/db/repositories/user.repository.js', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    incrementFailedLogins: vi.fn(),
    resetFailedLogins: vi.fn(),
    lockAccount: vi.fn(),
    update: vi.fn(),
    verifyEmail: vi.fn(),
  },
}));

vi.mock('../../../../src/db/repositories/account.repository.js', () => ({
  accountRepository: {
    findById: vi.fn(),
    create: vi.fn(),
  },
}));

vi.mock('../../../../src/db/repositories/session.repository.js', () => ({
  getSessionRepository: vi.fn(),
}));

vi.mock('../../../../src/db/repositories/token.repository.js', () => ({
  emailVerificationTokenRepository: {
    create: vi.fn().mockResolvedValue(undefined),
    findByToken: vi.fn(),
    markAsUsed: vi.fn(),
  },
  passwordResetTokenRepository: {
    create: vi.fn().mockResolvedValue(undefined),
    findByToken: vi.fn(),
    markAsUsed: vi.fn(),
  },
  generateToken: vi.fn().mockReturnValue('mock-token'),
}));

vi.mock('../../../../src/utils/crypto.js', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
  validatePassword: vi.fn(),
}));

vi.mock('../../../../src/services/email.service.js', () => ({
  EmailService: vi.fn().mockImplementation(() => ({
    sendEmailVerification: vi.fn().mockResolvedValue(undefined),
    sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
  })),
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use(cookieParser());
  app.use(createAuthRoutes());
  return app;
}

const mockUser = {
  id: 'user-123',
  email: 'test@example.com',
  passwordHash: 'hashed-password',
  name: 'John Doe',
  role: 'user',
  emailVerified: false,
  accountId: 'account-123',
  loginFailedCount: 0,
  lockedUntil: null,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockAccount = {
  id: 'account-123',
  displayName: "John Doe's Account",
  plan: 'free',
  status: 'active',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

const mockSession = {
  sessionId: 'mock-session-id',
  userId: 'user-123',
  accountId: 'account-123',
  role: 'user' as const,
  csrfToken: 'mock-csrf-token',
  ipAddress: '127.0.0.1',
  userAgent: 'test-agent',
  createdAt: new Date(),
  lastActivityAt: new Date(),
  expiresAt: new Date(Date.now() + 30 * 60 * 1000),
};

describe('Auth Routes', () => {
  let mockSessionRepo: {
    create: ReturnType<typeof vi.fn>;
    findById: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
    updateActivity: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSessionRepo = {
      create: vi.fn().mockResolvedValue(mockSession),
      findById: vi.fn().mockResolvedValue(mockSession),
      delete: vi.fn().mockResolvedValue(undefined),
      updateActivity: vi.fn().mockResolvedValue(undefined),
    };
    vi.mocked(getSessionRepository).mockResolvedValue(mockSessionRepo as any);
    vi.mocked(validatePassword).mockReturnValue({ valid: true, errors: [] });
    vi.mocked(hashPassword).mockResolvedValue('hashed-password');
    vi.mocked(comparePassword).mockResolvedValue(true);
    vi.mocked(userRepository.resetFailedLogins).mockResolvedValue(undefined as any);
    vi.mocked(userRepository.update).mockResolvedValue(mockUser as any);
    vi.mocked(userRepository.incrementFailedLogins).mockResolvedValue(undefined as any);
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser as any);

      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'newuser@example.com', password: 'securepassword123', name: 'Jane Smith' });

      expect(res.status).toBe(201);
      expect(res.body.user).toBeDefined();
      expect(res.body.account).toBeDefined();
      expect(res.body.session.csrfToken).toBe('mock-csrf-token');
    });

    it('should create account with free plan', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser as any);

      await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'newuser@example.com', password: 'securepassword123', name: 'Jane Smith' });

      expect(accountRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        plan: 'free',
      }));
    });

    it('should return 409 when email already registered', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);

      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'existing@example.com', password: 'password12345', name: 'John Doe' });

      expect(res.status).toBe(409);
      expect(res.body.error).toBe('An account with this email already exists');
    });

    it('should return 400 for invalid email format', async () => {
      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', password: 'password12345', name: 'John Doe' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 for password too short', async () => {
      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'short', name: 'John Doe' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should return 400 when required fields are missing', async () => {
      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'user@example.com', password: 'password12345' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });

    it('should hash password before storing', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password-value');
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser as any);

      await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'new@example.com', password: 'mypassword123', name: 'Test User' });

      expect(hashPassword).toHaveBeenCalledWith('mypassword123');
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        passwordHash: 'hashed-password-value',
      }));
    });

    it('should set session cookie with correct options', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount as any);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser as any);

      const res = await request(buildApp())
        .post('/api/auth/register')
        .send({ email: 'test@example.com', password: 'password12345', name: 'Test User' });

      expect(res.status).toBe(201);
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      const sessionCookie = cookies.find((c: string) => c.startsWith('session_id='));
      expect(sessionCookie).toBeDefined();
      expect(sessionCookie).toContain('HttpOnly');
      expect(sessionCookie).toContain('Path=/');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login user with valid credentials', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);

      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correctpassword' });

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.account).toBeDefined();
      expect(res.body.user.email).toBe('test@example.com');
    });

    it('should return 401 for invalid email', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', password: 'password123' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return 401 for invalid password', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(comparePassword).mockResolvedValue(false);

      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'wrongpassword' });

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Invalid email or password');
    });

    it('should return 403 for suspended account', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue({ ...mockAccount, status: 'suspended' } as any);

      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correctpassword' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account has been suspended. Please contact support');
    });

    it('should return 403 for non-active account', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue({ ...mockAccount, status: 'cancelled' } as any);

      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correctpassword' });

      expect(res.status).toBe(403);
      expect(res.body.error).toBe('Account is cancelled');
    });

    it('should create new session on login', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);

      await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com', password: 'correctpassword' });

      expect(mockSessionRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
      }));
    });

    it('should return 400 for missing required fields', async () => {
      const res = await request(buildApp())
        .post('/api/auth/login')
        .send({ email: 'test@example.com' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should logout user and clear session', async () => {
      const res = await request(buildApp())
        .post('/api/auth/logout')
        .set('Cookie', 'session_id=valid-session');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSessionRepo.delete).toHaveBeenCalledWith('valid-session');
    });

    it('should handle logout without session', async () => {
      const res = await request(buildApp())
        .post('/api/auth/logout');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(mockSessionRepo.delete).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/auth/me', () => {
    it('should return current user data', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=valid-session');

      expect(res.status).toBe(200);
      expect(res.body.user).toBeDefined();
      expect(res.body.account).toBeDefined();
      expect(res.body.user.id).toBe('user-123');
      expect(res.body.user).not.toHaveProperty('passwordHash');
    });

    it('should return 401 when not authenticated', async () => {
      const res = await request(buildApp()).get('/api/auth/me');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Not authenticated');
    });

    it('should return 401 when session expired', async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=expired-session');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Session expired or invalid');
    });

    it('should clear cookies when session expired', async () => {
      mockSessionRepo.findById.mockResolvedValue(null);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=expired-session');

      expect(res.status).toBe(401);
      const cookies = res.headers['set-cookie'] as string[];
      expect(cookies).toBeDefined();
      expect(cookies.some((c: string) => /^session_id=;/.test(c))).toBe(true);
    });

    it('should return 401 when user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=valid-session');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('User not found');
    });

    it('should return 401 when account not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=valid-session');

      expect(res.status).toBe(401);
      expect(res.body.error).toBe('Account not found');
    });

    it('should return correct user fields', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=valid-session');

      expect(res.body.user).toHaveProperty('id');
      expect(res.body.user).toHaveProperty('email');
      expect(res.body.user).toHaveProperty('name');
      expect(res.body.user).toHaveProperty('role');
      expect(res.body.user).toHaveProperty('emailVerified');
      expect(res.body.user).toHaveProperty('createdAt');
      expect(res.body.user).toHaveProperty('updatedAt');
    });

    it('should return correct account fields', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser as any);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount as any);

      const res = await request(buildApp())
        .get('/api/auth/me')
        .set('Cookie', 'session_id=valid-session');

      expect(res.body.account).toHaveProperty('id');
      expect(res.body.account).toHaveProperty('plan');
      expect(res.body.account).toHaveProperty('status');
      expect(res.body.account).toHaveProperty('createdAt');
      expect(res.body.account).toHaveProperty('updatedAt');
    });
  });
});
