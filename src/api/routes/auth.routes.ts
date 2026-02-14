import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { hashPassword, comparePassword, validatePassword } from '../../utils/crypto.js';
import { userRepository } from '../../db/repositories/user.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { getSessionRepository } from '../../db/repositories/session.repository.js';
import { logger } from '../../utils/logger.js';

const SESSION_COOKIE_NAME = 'session_id';
const CSRF_COOKIE_NAME = 'csrf_token';
const ACCOUNT_LOCK_DURATION_MS = 15 * 60 * 1000;
const MAX_FAILED_LOGIN_ATTEMPTS = 5;

const registerSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(8).max(128),
  name: z.string().min(2).max(100).trim(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
  rememberMe: z.boolean().optional(),
});

export function createAuthRoutes() {
  const router = Router();

  router.post('/api/auth/register', async (req: Request, res: Response) => {
    try {
      const validationResult = registerSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { email, password, name } = validationResult.data;

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        // Skip audit logging - no user ID yet
        return res.status(400).json({
          error: 'Password validation failed',
          details: passwordValidation.errors,
        });
      }

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        // Skip audit logging - no user ID yet
        return res.status(409).json({
          error: 'An account with this email already exists',
        });
      }

      const passwordHash = await hashPassword(password);

      const account = await accountRepository.create({
        displayName: `${name}'s Account`,
        plan: 'free',
      });

      const user = await userRepository.create({
        accountId: account.id,
        email,
        passwordHash,
        name,
        role: 'user',
        emailVerified: false,
        termsAcceptedAt: new Date(),
        termsVersion: '1.0.0',
      });

      const sessionRepo = await getSessionRepository();
      const session = await sessionRepo.create({
        userId: user.id,
        accountId: account.id,
        role: user.role,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        rememberMe: false,
      });

      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge: 30 * 60 * 1000,
        path: '/',
      };

      res.cookie(SESSION_COOKIE_NAME, session.sessionId, cookieOptions);
      res.cookie(CSRF_COOKIE_NAME, session.csrfToken, {
        ...cookieOptions,
        httpOnly: false,
      });

      logger.info({ userId: user.id, email: user.email }, 'User registered successfully');

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.status(201).json({
        user: userWithoutPassword,
        account,
        session: {
          csrfToken: session.csrfToken,
        },
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Registration error');
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  router.post('/api/auth/login', async (req: Request, res: Response) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({
          error: 'Validation failed',
          details: validationResult.error.errors,
        });
      }

      const { email, password, rememberMe } = validationResult.data;

      const user = await userRepository.findByEmail(email);
      if (!user) {
        // Skip audit logging - no user ID
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      if (user.lockedUntil && user.lockedUntil > new Date()) {
        const minutesRemaining = Math.ceil((user.lockedUntil.getTime() - Date.now()) / 60000);
        logger.warn({ userId: user.id, minutesRemaining }, 'Login attempt on locked account');
        return res.status(403).json({
          error: `Account is locked. Please try again in ${minutesRemaining} minute(s)`,
        });
      }

      if (!user.passwordHash) {
        // Skip audit logging for security
        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      const isPasswordValid = await comparePassword(password, user.passwordHash);
      if (!isPasswordValid) {
        const newFailedCount = user.loginFailedCount + 1;
        await userRepository.incrementFailedLogins(user.id);

        if (newFailedCount >= MAX_FAILED_LOGIN_ATTEMPTS) {
          const lockUntil = new Date(Date.now() + ACCOUNT_LOCK_DURATION_MS);
          await userRepository.lockAccount(user.id, lockUntil);
          
          logger.warn({ userId: user.id, failedAttempts: newFailedCount }, 'Account locked due to failed login attempts');

          return res.status(403).json({
            error: 'Account locked due to too many failed login attempts. Please try again in 15 minutes',
          });
        }

        logger.warn({ userId: user.id, failedAttempts: newFailedCount }, 'Failed login attempt');

        return res.status(401).json({
          error: 'Invalid email or password',
        });
      }

      const account = await accountRepository.findById(user.accountId);
      if (!account) {
        logger.error({ userId: user.id }, 'User account not found');
        return res.status(500).json({
          error: 'Internal server error',
        });
      }

      if (account.status === 'suspended') {
        // Skip audit logging for now
        return res.status(403).json({
          error: 'Account has been suspended. Please contact support',
        });
      }

      if (account.status !== 'active') {
        // Skip audit logging for now
        return res.status(403).json({
          error: `Account is ${account.status}`,
        });
      }

      await userRepository.resetFailedLogins(user.id);
      await userRepository.update(user.id, {
        lastLoginAt: new Date(),
        lastLoginIp: req.ip || 'unknown',
      });

      const sessionRepo = await getSessionRepository();
      const session = await sessionRepo.create({
        userId: user.id,
        accountId: account.id,
        role: user.role,
        ipAddress: req.ip || 'unknown',
        userAgent: req.get('user-agent') || 'unknown',
        rememberMe: rememberMe || false,
      });

      const maxAge = rememberMe ? 30 * 24 * 60 * 60 * 1000 : 30 * 60 * 1000;
      const cookieOptions = {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax' as const,
        maxAge,
        path: '/',
      };

      res.cookie(SESSION_COOKIE_NAME, session.sessionId, cookieOptions);
      res.cookie(CSRF_COOKIE_NAME, session.csrfToken, {
        ...cookieOptions,
        httpOnly: false,
      });

      logger.info({ userId: user.id, email: user.email, rememberMe: rememberMe || false }, 'User logged in successfully');

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        account,
        session: {
          csrfToken: session.csrfToken,
        },
      });
    } catch (error) {
      logger.error({ error, body: req.body }, 'Login error');
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  router.post('/api/auth/logout', async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies[SESSION_COOKIE_NAME];

      if (sessionId) {
        const sessionRepo = await getSessionRepository();
        const session = await sessionRepo.findById(sessionId);

        if (session) {
          await sessionRepo.delete(sessionId);
          logger.info({ userId: session.userId }, 'User logged out successfully');
        }
      }

      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });

      res.json({ success: true });
    } catch (error) {
      logger.error({ error }, 'Logout error');
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  router.get('/api/auth/me', async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies[SESSION_COOKIE_NAME];

      if (!sessionId) {
        return res.status(401).json({
          error: 'Not authenticated',
        });
      }

      const sessionRepo = await getSessionRepository();
      const session = await sessionRepo.findById(sessionId);

      if (!session) {
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
        return res.status(401).json({
          error: 'Session expired or invalid',
        });
      }

      await sessionRepo.updateActivity(sessionId);

      const user = await userRepository.findById(session.userId);
      if (!user) {
        await sessionRepo.delete(sessionId);
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
        return res.status(401).json({
          error: 'User not found',
        });
      }

      const account = await accountRepository.findById(session.accountId);
      if (!account) {
        await sessionRepo.delete(sessionId);
        res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
        res.clearCookie(CSRF_COOKIE_NAME, { path: '/' });
        return res.status(401).json({
          error: 'Account not found',
        });
      }

      const { passwordHash: _, ...userWithoutPassword } = user;
      res.json({
        user: userWithoutPassword,
        account,
        session: {
          csrfToken: session.csrfToken,
        },
      });
    } catch (error) {
      logger.error({ error }, 'Get current user error');
      res.status(500).json({
        error: 'Internal server error',
      });
    }
  });

  return router;
}
