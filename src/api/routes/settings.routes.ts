import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { userRepository } from '../../db/repositories/user.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { getSessionRepository } from '../../db/repositories/session.repository.js';
import { comparePassword, hashPassword } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/settings/profile - Get user profile
router.get('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const account = await accountRepository.findById(user.accountId);

    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt,
      },
      account: {
        id: account?.id,
        displayName: account?.displayName,
        plan: account?.plan,
        status: account?.status,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch profile');
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// PATCH /api/settings/profile - Update user profile
router.patch('/profile', requireAuth, async (req: Request, res: Response) => {
  try {
    const { name } = req.body;

    if (!name || name.trim().length < 1) {
      return res.status(400).json({ error: 'Name is required' });
    }

    await userRepository.update(req.user!.id, { name: name.trim() });

    logger.info({ userId: req.user!.id }, 'Profile updated');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to update profile');
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/settings/avatar - Upload avatar (placeholder)
router.post('/avatar', requireAuth, async (req: Request, res: Response) => {
  try {
    // Placeholder - avatar upload not fully implemented
    res.json({ success: true, avatarUrl: null });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to upload avatar');
    res.status(500).json({ error: 'Failed to upload avatar' });
  }
});

// PATCH /api/settings/appearance - Update appearance settings
router.patch('/appearance', requireAuth, async (req: Request, res: Response) => {
  try {
    const { theme } = req.body;

    if (theme && !['light', 'dark', 'system'].includes(theme)) {
      return res.status(400).json({ error: 'Invalid theme value' });
    }

    // Store in user preferences (simplified)
    res.json({ success: true, theme });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to update appearance');
    res.status(500).json({ error: 'Failed to update appearance settings' });
  }
});

// POST /api/settings/password - Change password
router.post('/password', requireAuth, async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new password are required' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters' });
    }

    const user = await userRepository.findById(req.user!.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const isValid = await comparePassword(currentPassword, user.passwordHash);
    if (!isValid) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }

    const newHash = await hashPassword(newPassword);
    await userRepository.update(user.id, { passwordHash: newHash });

    logger.info({ userId: user.id }, 'Password changed');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to change password');
    res.status(500).json({ error: 'Failed to change password' });
  }
});

// GET /api/settings/sessions - Get active sessions
router.get('/sessions', requireAuth, async (req: Request, res: Response) => {
  try {
    const sessionRepo = await getSessionRepository();
    const sessionIds = await sessionRepo.getUserSessions(req.user!.id);

    const sessions = [];
    for (const sessionId of sessionIds) {
      const session = await sessionRepo.findById(sessionId);
      if (session) {
        sessions.push({
          id: sessionId,
          createdAt: session.createdAt,
          lastActivityAt: session.lastActivityAt,
          isCurrent: sessionId === req.sessionId,
        });
      }
    }

    res.json({ sessions });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch sessions');
    res.status(500).json({ error: 'Failed to fetch sessions' });
  }
});

// DELETE /api/settings/sessions/:id - Revoke a session
router.delete('/sessions/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (id === req.sessionId) {
      return res.status(400).json({ error: 'Cannot revoke current session' });
    }

    const sessionRepo = await getSessionRepository();
    const session = await sessionRepo.findById(id);

    if (!session || session.userId !== req.user!.id) {
      return res.status(404).json({ error: 'Session not found' });
    }

    await sessionRepo.delete(id);

    logger.info({ userId: req.user!.id, sessionId: id }, 'Session revoked');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to revoke session');
    res.status(500).json({ error: 'Failed to revoke session' });
  }
});

// GET /api/settings/notifications - Get notification preferences
router.get('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    // Placeholder - return default preferences
    res.json({
      preferences: {
        emailNotifications: true,
        jobCompletionEmails: true,
        weeklyReports: false,
        marketingEmails: false,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch preferences');
    res.status(500).json({ error: 'Failed to fetch notification preferences' });
  }
});

// PATCH /api/settings/notifications - Update notification preferences
router.patch('/notifications', requireAuth, async (req: Request, res: Response) => {
  try {
    // Placeholder - just acknowledge the update
    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to update preferences');
    res.status(500).json({ error: 'Failed to update notification preferences' });
  }
});

export function createSettingsRoutes() {
  return router;
}
