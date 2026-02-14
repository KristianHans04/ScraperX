import { FastifyPluginAsync, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { notificationService } from '../../services/notification.service.js';

const paginationSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const notificationsRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const query = request.query as any;
    const pagination = paginationSchema.parse(query);

    try {
      const result = await notificationService.getNotifications(userId, pagination);
      return reply.send(result);
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/recent', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { limit } = request.query as { limit?: string };
    const limitNum = limit ? parseInt(limit, 10) : 10;

    try {
      const notifications = await notificationService.getRecentNotifications(
        userId,
        limitNum
      );
      return reply.send({ notifications });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/unread', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const notifications = await notificationService.getUnreadNotifications(userId);
      return reply.send({ notifications });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.get('/unread-count', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const count = await notificationService.getUnreadCount(userId);
      return reply.send({ count });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.patch('/:id/read', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as { id: string };

    try {
      await notificationService.markAsRead(id, userId);
      return reply.send({ success: true });
    } catch (error) {
      const errorMsg = (error as Error).message;
      const status = errorMsg.includes('not found') || errorMsg.includes('unauthorized') 
        ? 404 
        : 400;
      return reply.status(status).send({ error: errorMsg });
    }
  });

  fastify.post('/read-all', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    try {
      const count = await notificationService.markAllAsRead(userId);
      return reply.send({ success: true, count });
    } catch (error) {
      return reply.status(500).send({ error: (error as Error).message });
    }
  });

  fastify.delete('/:id', async (request: FastifyRequest, reply: FastifyReply) => {
    const userId = request.user?.id;
    if (!userId) {
      return reply.status(401).send({ error: 'Unauthorized' });
    }

    const { id } = request.params as { id: string };

    try {
      await notificationService.deleteNotification(id, userId);
      return reply.send({ success: true });
    } catch (error) {
      const errorMsg = (error as Error).message;
      const status = errorMsg.includes('not found') || errorMsg.includes('unauthorized') 
        ? 404 
        : 400;
      return reply.status(status).send({ error: errorMsg });
    }
  });
};
