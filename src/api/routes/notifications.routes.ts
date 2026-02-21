import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { notificationService } from '../../services/notification.service.js';
import { requireAuth } from '../middleware/authExpress.js';

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export function createNotificationsRoutes() {
  const router = Router();

  router.get('/', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const pagination = paginationSchema.parse(req.query);
    try {
      const result = await notificationService.getNotifications(userId, pagination);
      return res.json(result);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/recent', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : 10;
    try {
      const notifications = await notificationService.getRecentNotifications(userId, limit);
      return res.json({ notifications });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/unread', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    try {
      const notifications = await notificationService.getUnreadNotifications(userId);
      return res.json({ notifications });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.get('/unread-count', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    try {
      const count = await notificationService.getUnreadCount(userId);
      return res.json({ count });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.patch('/:id/read', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    try {
      await notificationService.markAsRead(id, userId);
      return res.json({ success: true });
    } catch (error) {
      const errorMsg = (error as Error).message;
      const status = errorMsg.includes('not found') || errorMsg.includes('unauthorized') ? 404 : 400;
      return res.status(status).json({ error: errorMsg });
    }
  });

  router.post('/read-all', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    try {
      const count = await notificationService.markAllAsRead(userId);
      return res.json({ success: true, count });
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
    const userId = (req as any).user?.id;
    const { id } = req.params;
    try {
      await notificationService.deleteNotification(id, userId);
      return res.json({ success: true });
    } catch (error) {
      const errorMsg = (error as Error).message;
      const status = errorMsg.includes('not found') || errorMsg.includes('unauthorized') ? 404 : 400;
      return res.status(status).json({ error: errorMsg });
    }
  });

  return router;
}

export const notificationsRoutes = createNotificationsRoutes;
