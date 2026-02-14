import { Router } from 'express';
import { getPool } from '../../../db/connection';
import { requireAdmin, AdminRequest } from '../../middleware/requireAdmin';
import { auditLogger } from '../../middleware/auditLogger';
import { supportTicketRepository } from '../../../db/repositories/supportTicket.repository';

const router = Router();

router.get('/', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    
    const filters: any = {
      page,
      limit,
      status: req.query.status as string,
      priority: req.query.priority as string,
      category: req.query.category as string,
      assignedToUserId: req.query.assignedTo as string,
      search: req.query.search as string,
    };

    if (req.query.unassigned === 'true') {
      filters.unassignedOnly = true;
    }

    const result = await supportTicketRepository.list(filters);

    res.json({
      tickets: result.items,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

router.get('/:id', requireAdmin, async (req: AdminRequest, res) => {
  try {
    const ticket = await supportTicketRepository.findById(req.params.id);
    if (!ticket) {
      return res.status(404).json({ error: 'Ticket not found' });
    }

    const messages = await supportTicketRepository.getMessages(req.params.id);

    const userQuery = await getPool().query(
      'SELECT id, email, name FROM users WHERE id = $1',
      [ticket.userId]
    );
    
    const accountQuery = await getPool().query(
      'SELECT id, display_name, plan FROM account WHERE id = $1',
      [ticket.accountId]
    );

    res.json({
      ticket,
      messages,
      user: userQuery.rows[0],
      account: accountQuery.rows[0],
    });
  } catch (error) {
    console.error('Error fetching ticket detail:', error);
    res.status(500).json({ error: 'Failed to fetch ticket details' });
  }
});

router.post(
  '/:id/assign',
  requireAdmin,
  auditLogger({
    category: 'support',
    action: 'ticket.assign',
    resourceType: 'ticket',
    getDetails: (req) => ({ assignedTo: req.body.adminId }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const { adminId } = req.body;
      await supportTicketRepository.assign(req.params.id, adminId || req.user!.id);
      res.json({ message: 'Ticket assigned successfully' });
    } catch (error) {
      console.error('Error assigning ticket:', error);
      res.status(500).json({ error: 'Failed to assign ticket' });
    }
  }
);

router.post(
  '/:id/status',
  requireAdmin,
  auditLogger({
    category: 'support',
    action: 'ticket.status_change',
    resourceType: 'ticket',
    getDetails: (req) => ({ newStatus: req.body.status }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const { status } = req.body;
      await supportTicketRepository.updateStatus(req.params.id, status);
      res.json({ message: 'Ticket status updated successfully' });
    } catch (error) {
      console.error('Error updating ticket status:', error);
      res.status(500).json({ error: 'Failed to update ticket status' });
    }
  }
);

router.post(
  '/:id/priority',
  requireAdmin,
  auditLogger({
    category: 'support',
    action: 'ticket.priority_change',
    resourceType: 'ticket',
    getDetails: (req) => ({ newPriority: req.body.priority }),
  }),
  async (req: AdminRequest, res) => {
    try {
      const { priority } = req.body;
      await supportTicketRepository.updatePriority(req.params.id, priority);
      res.json({ message: 'Ticket priority updated successfully' });
    } catch (error) {
      console.error('Error updating ticket priority:', error);
      res.status(500).json({ error: 'Failed to update ticket priority' });
    }
  }
);

router.post(
  '/:id/reply',
  requireAdmin,
  auditLogger({
    category: 'support',
    action: 'ticket.reply',
    resourceType: 'ticket',
  }),
  async (req: AdminRequest, res) => {
    try {
      const { message } = req.body;
      
      await supportTicketRepository.addMessage({
        ticketId: req.params.id,
        userId: req.user!.id,
        isStaff: true,
        message,
        isInternal: false,
      });

      res.json({ message: 'Reply sent successfully' });
    } catch (error) {
      console.error('Error replying to ticket:', error);
      res.status(500).json({ error: 'Failed to send reply' });
    }
  }
);

router.post(
  '/:id/internal-note',
  requireAdmin,
  auditLogger({
    category: 'support',
    action: 'ticket.internal_note',
    resourceType: 'ticket',
  }),
  async (req: AdminRequest, res) => {
    try {
      const { note } = req.body;
      
      await supportTicketRepository.addMessage({
        ticketId: req.params.id,
        userId: req.user!.id,
        isStaff: true,
        message: note,
        isInternal: true,
      });

      res.json({ message: 'Internal note added successfully' });
    } catch (error) {
      console.error('Error adding internal note:', error);
      res.status(500).json({ error: 'Failed to add internal note' });
    }
  }
);

export default router;
