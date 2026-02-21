import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { hashPassword, comparePassword, validatePassword } from '../../utils/crypto.js';
import { userRepository } from '../../db/repositories/user.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { getSessionRepository } from '../../db/repositories/session.repository.js';
import { emailVerificationTokenRepository, passwordResetTokenRepository, generateToken } from '../../db/repositories/token.repository.js';
import { EmailService } from '../../services/email.service.js';
import { logger } from '../../utils/logger.js';

const emailService = new EmailService();

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

      // Send verification email (non-blocking)
      try {
        const verificationToken = generateToken();
        await emailVerificationTokenRepository.create({
          userId: user.id,
          token: verificationToken,
          email: user.email,
          purpose: 'registration',
          expiresInHours: 24,
        });
        await emailService.sendEmailVerification(user.email, verificationToken);
      } catch (emailError) {
        logger.warn({ emailError, userId: user.id }, 'Failed to send verification email (non-fatal)');
      }

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

  // Verify email
  router.post('/api/auth/verify-email', async (req: Request, res: Response) => {
    try {
      const { token } = req.body;
      if (!token) {
        return res.status(400).json({ error: 'Token is required' });
      }

      const tokenRecord = await emailVerificationTokenRepository.findByToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid or expired verification token' });
      }

      if (tokenRecord.usedAt) {
        return res.status(400).json({ error: 'Token already used' });
      }

      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Verification token has expired' });
      }

      await userRepository.verifyEmail(tokenRecord.userId);
      await emailVerificationTokenRepository.markAsUsed(tokenRecord.tokenHash);

      logger.info({ userId: tokenRecord.userId }, 'Email verified successfully');
      res.json({ success: true, message: 'Email verified successfully' });
    } catch (error) {
      logger.error({ error }, 'Email verification error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Forgot password
  router.post('/api/auth/forgot-password', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }

      const user = await userRepository.findByEmail(email);
      // Always return success to prevent email enumeration
      if (user) {
        try {
          const resetToken = generateToken();
          await passwordResetTokenRepository.create({
            userId: user.id,
            token: resetToken,
            expiresInHours: 1,
            ipAddress: req.ip || 'unknown',
          });
          await emailService.sendPasswordResetEmail(user.email, resetToken);
        } catch (emailError) {
          logger.warn({ emailError, email }, 'Failed to send password reset email');
        }
      }

      res.json({ success: true, message: 'If that email is registered, a reset link has been sent' });
    } catch (error) {
      logger.error({ error }, 'Forgot password error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  // Reset password
  router.post('/api/auth/reset-password', async (req: Request, res: Response) => {
    try {
      const { token, password } = req.body;
      if (!token || !password) {
        return res.status(400).json({ error: 'Token and password are required' });
      }

      const passwordValidation = validatePassword(password);
      if (!passwordValidation.valid) {
        return res.status(400).json({ error: 'Password validation failed', details: passwordValidation.errors });
      }

      const tokenRecord = await passwordResetTokenRepository.findByToken(token);
      if (!tokenRecord) {
        return res.status(400).json({ error: 'Invalid or expired reset token' });
      }

      if (tokenRecord.usedAt) {
        return res.status(400).json({ error: 'Token already used' });
      }

      if (new Date(tokenRecord.expiresAt) < new Date()) {
        return res.status(400).json({ error: 'Reset token has expired' });
      }

      const passwordHash = await hashPassword(password);
      await userRepository.update(tokenRecord.userId, { passwordHash });
      await passwordResetTokenRepository.markAsUsed(tokenRecord.tokenHash);

      logger.info({ userId: tokenRecord.userId }, 'Password reset successfully');
      res.json({ success: true, message: 'Password reset successfully' });
    } catch (error) {
      logger.error({ error }, 'Reset password error');
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
