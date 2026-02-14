import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// In-memory ticket storage (placeholder - would use database in production)
interface Ticket {
  id: string;
  accountId: string;
  userId: string;
  subject: string;
  message: string;
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

const tickets: Ticket[] = [];
let ticketCounter = 1;

// GET /api/support/tickets - List support tickets
router.get('/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;

    const userTickets = tickets.filter(t => t.accountId === accountId);

    res.json({
      tickets: userTickets.map(t => ({
        id: t.id,
        subject: t.subject,
        status: t.status,
        priority: t.priority,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch tickets');
    res.status(500).json({ error: 'Failed to fetch support tickets' });
  }
});

// POST /api/support/tickets - Create a support ticket
router.post('/tickets', requireAuth, async (req: Request, res: Response) => {
  try {
    const { subject, message, priority = 'medium' } = req.body;

    if (!subject || subject.trim().length < 3) {
      return res.status(400).json({ error: 'Subject must be at least 3 characters' });
    }

    if (!message || message.trim().length < 10) {
      return res.status(400).json({ error: 'Message must be at least 10 characters' });
    }

    const ticket: Ticket = {
      id: `TICKET-${ticketCounter++}`,
      accountId: req.user!.accountId,
      userId: req.user!.id,
      subject: subject.trim(),
      message: message.trim(),
      status: 'open',
      priority,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    tickets.push(ticket);

    logger.info({ userId: req.user!.id, ticketId: ticket.id }, 'Support ticket created');

    res.status(201).json({
      ticket: {
        id: ticket.id,
        subject: ticket.subject,
        status: ticket.status,
        priority: ticket.priority,
        createdAt: ticket.createdAt,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to create ticket');
    res.status(500).json({ error: 'Failed to create support ticket' });
  }
});

// GET /api/support/tickets/:id - Get ticket details
router.get('/tickets/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const accountId = req.user!.accountId;

    const ticket = tickets.find(t => t.id === id && t.accountId === accountId);

    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    res.json({ ticket });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to fetch ticket');
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

export function createSupportRoutes() {
  return router;
}
