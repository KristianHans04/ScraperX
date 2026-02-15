/**
 * Unit tests for Auth Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { authRoutes } from '@api/routes/auth.routes.js';
import { 
  userRepository, 
  accountRepository, 
  sessionRepository 
} from '../../../src/db/index.js';
import { hashPassword, comparePassword } from '../../../src/utils/crypto.js';

// Mock the dependencies
vi.mock('../../../src/db/index', () => ({
  userRepository: {
    findByEmail: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  },
  accountRepository: {
    findById: vi.fn(),
    create: vi.fn(),
  },
  sessionRepository: {
    create: vi.fn(),
    get: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('../../../src/utils/crypto', () => ({
  hashPassword: vi.fn(),
  comparePassword: vi.fn(),
}));

vi.mock('nanoid', () => ({
  nanoid: vi.fn().mockReturnValue('mock-session-id'),
}));

describe('Auth Routes', () => {
  let mockServer: any;
  let routeHandlers: Record<string, Function>;
  let routeSchemas: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};
    routeSchemas = {};
    mockServer = {
      post: vi.fn((path: string, schemaOrHandler: any, handler?: Function) => {
        if (handler) {
          routeHandlers[path] = handler;
          routeSchemas[path] = schemaOrHandler;
        } else {
          routeHandlers[path] = schemaOrHandler;
        }
      }),
      get: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
    };
  });

  const createMockRequest = (
    cookies: Record<string, string> = {},
    body: Record<string, any> = {}
  ) => ({
    cookies,
    body,
  });

  const mockReply = () => ({
    setCookie: vi.fn().mockReturnThis(),
    clearCookie: vi.fn().mockReturnThis(),
    code: vi.fn().mockReturnThis(),
  });

  const mockUser = {
    id: 'user-123',
    email: 'test@example.com',
    passwordHash: 'hashed-password',
    firstName: 'John',
    lastName: 'Doe',
    role: 'user',
    emailVerified: false,
    mfaEnabled: false,
    accountId: 'account-123',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  const mockAccount = {
    id: 'account-123',
    plan: 'free',
    creditBalance: 1000,
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };

  describe('POST /api/auth/register', () => {
    beforeEach(async () => {
      await authRoutes(mockServer as any);
    });

    it('should register a new user successfully', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const request = createMockRequest({}, {
        email: 'newuser@example.com',
        password: 'securepassword123',
        firstName: 'Jane',
        lastName: 'Smith',
      });
      const reply = mockReply();
      const result = await routeHandlers['/api/auth/register'](request, reply);

      expect(result.user).toBeDefined();
      expect(result.account).toBeDefined();
      expect(result.user.email).toBe('newuser@example.com');
      expect(reply.setCookie).toHaveBeenCalledWith(
        'sessionId',
        'mock-session-id',
        expect.objectContaining({
          httpOnly: true,
          sameSite: 'lax',
          path: '/',
        })
      );
    });

    it('should create free account with 1000 credits', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password');
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const createAccountMock = vi.fn().mockResolvedValue(mockAccount);
      vi.mocked(accountRepository.create).mockImplementation(createAccountMock);

      const request = createMockRequest({}, {
        email: 'newuser@example.com',
        password: 'securepassword123',
        firstName: 'Jane',
        lastName: 'Smith',
      });
      const reply = mockReply();
      await routeHandlers['/api/auth/register'](request, reply);

      expect(createAccountMock).toHaveBeenCalledWith(expect.objectContaining({
        plan: 'free',
        creditBalance: 1000,
        status: 'active',
      }));
    });

    it('should throw error when email already registered', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);

      const request = createMockRequest({}, {
        email: 'existing@example.com',
        password: 'password123',
        firstName: 'John',
        lastName: 'Doe',
      });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/register'](request, reply)).rejects.toThrow('Email already registered');
    });

    it('should validate email format', async () => {
      expect(routeSchemas['/api/auth/register']).toBeDefined();
      expect(routeSchemas['/api/auth/register'].schema.body.properties.email.format).toBe('email');
    });

    it('should validate password minimum length', async () => {
      expect(routeSchemas['/api/auth/register'].schema.body.properties.password.minLength).toBe(8);
    });

    it('should validate required fields', async () => {
      const required = routeSchemas['/api/auth/register'].schema.body.required;
      expect(required).toContain('email');
      expect(required).toContain('password');
      expect(required).toContain('firstName');
      expect(required).toContain('lastName');
    });

    it('should hash password before storing', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed-password-value');
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const request = createMockRequest({}, {
        email: 'new@example.com',
        password: 'mypassword123',
        firstName: 'Test',
        lastName: 'User',
      });
      const reply = mockReply();
      await routeHandlers['/api/auth/register'](request, reply);

      expect(hashPassword).toHaveBeenCalledWith('mypassword123');
      expect(userRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        passwordHash: 'hashed-password-value',
      }));
    });

    it('should set session cookie with correct options', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(hashPassword).mockResolvedValue('hashed');
      vi.mocked(accountRepository.create).mockResolvedValue(mockAccount);
      vi.mocked(userRepository.create).mockResolvedValue(mockUser);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'password123',
        firstName: 'Test',
        lastName: 'User',
      });
      const reply = mockReply();
      await routeHandlers['/api/auth/register'](request, reply);

      expect(reply.setCookie).toHaveBeenCalledWith(
        'sessionId',
        expect.any(String),
        expect.objectContaining({
          httpOnly: true,
          secure: false, // NODE_ENV is test
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        })
      );
    });
  });

  describe('POST /api/auth/login', () => {
    beforeEach(async () => {
      await authRoutes(mockServer as any);
    });

    it('should login user with valid credentials', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'correctpassword',
      });
      const reply = mockReply();
      const result = await routeHandlers['/api/auth/login'](request, reply);

      expect(result.user).toBeDefined();
      expect(result.account).toBeDefined();
      expect(result.user.email).toBe('test@example.com');
    });

    it('should throw error for invalid email', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);

      const request = createMockRequest({}, {
        email: 'nonexistent@example.com',
        password: 'password123',
      });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/login'](request, reply)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for invalid password', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(false);

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'wrongpassword',
      });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/login'](request, reply)).rejects.toThrow('Invalid email or password');
    });

    it('should throw error for suspended account', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(accountRepository.findById).mockResolvedValue({
        ...mockAccount,
        status: 'suspended',
      });

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'correctpassword',
      });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/login'](request, reply)).rejects.toThrow('Account is suspended or cancelled');
    });

    it('should throw error for cancelled account', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(accountRepository.findById).mockResolvedValue({
        ...mockAccount,
        status: 'cancelled',
      });

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'correctpassword',
      });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/login'](request, reply)).rejects.toThrow('Account is suspended or cancelled');
    });

    it('should create new session on login', async () => {
      vi.mocked(userRepository.findByEmail).mockResolvedValue(mockUser);
      vi.mocked(comparePassword).mockResolvedValue(true);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);
      vi.mocked(sessionRepository.create).mockResolvedValue(undefined);

      const request = createMockRequest({}, {
        email: 'test@example.com',
        password: 'correctpassword',
      });
      const reply = mockReply();
      await routeHandlers['/api/auth/login'](request, reply);

      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.any(String),
        'user-123',
        7 * 24 * 60 * 60
      );
    });

    it('should validate required fields', async () => {
      const required = routeSchemas['/api/auth/login'].schema.body.required;
      expect(required).toContain('email');
      expect(required).toContain('password');
    });
  });

  describe('POST /api/auth/logout', () => {
    beforeEach(async () => {
      await authRoutes(mockServer as any);
    });

    it('should logout user and clear session', async () => {
      vi.mocked(sessionRepository.delete).mockResolvedValue(undefined);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const reply = mockReply();
      const result = await routeHandlers['/api/auth/logout'](request, reply);

      expect(sessionRepository.delete).toHaveBeenCalledWith('valid-session');
      expect(reply.clearCookie).toHaveBeenCalledWith('sessionId', { path: '/' });
      expect(result.message).toBe('Logged out successfully');
    });

    it('should handle logout without session', async () => {
      const request = createMockRequest({});
      const reply = mockReply();
      const result = await routeHandlers['/api/auth/logout'](request, reply);

      expect(sessionRepository.delete).not.toHaveBeenCalled();
      expect(reply.clearCookie).toHaveBeenCalled();
      expect(result.message).toBe('Logged out successfully');
    });
  });

  describe('GET /api/auth/me', () => {
    beforeEach(async () => {
      await authRoutes(mockServer as any);
    });

    it('should return current user data', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/auth/me'](request);

      expect(result.user).toBeDefined();
      expect(result.account).toBeDefined();
      expect(result.user.id).toBe('user-123');
      expect(result.user).not.toHaveProperty('passwordHash');
    });

    it('should throw error when not authenticated', async () => {
      const request = createMockRequest({});

      await expect(routeHandlers['/api/auth/me'](request)).rejects.toThrow('Not authenticated');
    });

    it('should throw error when session expired', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'expired-session' });
      const reply = mockReply();

      await expect(routeHandlers['/api/auth/me'](request, reply)).rejects.toThrow('Session expired');
    });

    it('should clear cookie when session expired', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'expired-session' });
      const reply = mockReply();

      try {
        await routeHandlers['/api/auth/me'](request, reply);
      } catch (e) {
        // Expected to throw
      }

      expect(reply.clearCookie).toHaveBeenCalledWith('sessionId', { path: '/' });
    });

    it('should throw error when user not found', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'valid-session' });

      await expect(routeHandlers['/api/auth/me'](request)).rejects.toThrow('User not found');
    });

    it('should throw error when account not found', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(accountRepository.findById).mockResolvedValue(null);

      const request = createMockRequest({ sessionId: 'valid-session' });

      await expect(routeHandlers['/api/auth/me'](request)).rejects.toThrow('Account not found');
    });

    it('should return correct user fields', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/auth/me'](request);

      expect(result.user).toHaveProperty('id');
      expect(result.user).toHaveProperty('email');
      expect(result.user).toHaveProperty('firstName');
      expect(result.user).toHaveProperty('lastName');
      expect(result.user).toHaveProperty('role');
      expect(result.user).toHaveProperty('emailVerified');
      expect(result.user).toHaveProperty('mfaEnabled');
      expect(result.user).toHaveProperty('createdAt');
      expect(result.user).toHaveProperty('updatedAt');
    });

    it('should return correct account fields', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(accountRepository.findById).mockResolvedValue(mockAccount);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/auth/me'](request);

      expect(result.account).toHaveProperty('id');
      expect(result.account).toHaveProperty('plan');
      expect(result.account).toHaveProperty('creditBalance');
      expect(result.account).toHaveProperty('status');
      expect(result.account).toHaveProperty('createdAt');
      expect(result.account).toHaveProperty('updatedAt');
    });
  });
});
