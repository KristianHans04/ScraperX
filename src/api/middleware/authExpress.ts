import { Request, Response, NextFunction } from 'express';
import { getSessionRepository } from '../../db/repositories/session.repository.js';
import { userRepository } from '../../db/repositories/user.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { logger } from '../../utils/logger.js';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        accountId: string;
        email: string;
        role: string;
      };
      account?: {
        id: string;
        plan: string;
        status: string;
      };
      sessionId?: string;
    }
  }
}

const SESSION_COOKIE_NAME = 'session_id';

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const sessionRepo = await getSessionRepository();
    const session = await sessionRepo.findById(sessionId);

    if (!session) {
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: 'Session expired or invalid' });
      return;
    }

    const user = await userRepository.findById(session.userId);
    if (!user) {
      await sessionRepo.delete(sessionId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: 'User not found' });
      return;
    }

    const account = await accountRepository.findById(session.accountId);
    if (!account) {
      await sessionRepo.delete(sessionId);
      res.clearCookie(SESSION_COOKIE_NAME, { path: '/' });
      res.status(401).json({ error: 'Account not found' });
      return;
    }

    if (account.status !== 'active') {
      res.status(403).json({ error: `Account is ${account.status}` });
      return;
    }

    await sessionRepo.updateActivity(sessionId);

    req.user = {
      id: user.id,
      accountId: user.accountId,
      email: user.email,
      role: user.role,
    };
    req.account = {
      id: account.id,
      plan: account.plan,
      status: account.status,
    };
    req.sessionId = sessionId;

    next();
  } catch (error) {
    logger.error({ error }, 'Auth middleware error');
    res.status(500).json({ error: 'Internal server error' });
  }
}

export async function requireAdmin(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'admin') {
      res.status(403).json({ error: 'Admin access required' });
      return;
    }
    next();
  });
}

export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const sessionId = req.cookies[SESSION_COOKIE_NAME];

    if (!sessionId) {
      next();
      return;
    }

    const sessionRepo = await getSessionRepository();
    const session = await sessionRepo.findById(sessionId);

    if (!session) {
      next();
      return;
    }

    const user = await userRepository.findById(session.userId);
    const account = await accountRepository.findById(session.accountId);

    if (user && account) {
      req.user = {
        id: user.id,
        accountId: user.accountId,
        email: user.email,
        role: user.role,
      };
      req.account = {
        id: account.id,
        plan: account.plan,
        status: account.status,
      };
      req.sessionId = sessionId;
      await sessionRepo.updateActivity(sessionId);
    }

    next();
  } catch (error) {
    logger.error({ error }, 'Optional auth middleware error');
    next();
  }
}
