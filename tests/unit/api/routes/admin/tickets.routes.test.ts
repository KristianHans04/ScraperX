/**
 * Unit tests for admin tickets routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';

vi.mock('../../../../../src/api/middleware/requireAdmin.js', () => ({
  requireAdmin: (req: any, _res: any, next: any) => {
    req.user = { id: 'admin-0001', email: 'admin@scrapifie.com', role: 'admin', accountId: 'account-admin-001' };
    next();
  },
}));

vi.mock('../../../../../src/db/connection.js', () => ({
  getPool: vi.fn(() => mockPool),
}));

vi.mock('../../../../../src/db/repositories/supportTicket.repository.js', () => ({
  supportTicketRepository: {
    list: vi.fn(),
    findById: vi.fn(),
    getMessages: vi.fn(),
    assign: vi.fn(),
    updateStatus: vi.fn(),
    updatePriority: vi.fn(),
    addMessage: vi.fn(),
  },
}));

vi.mock('../../../../../src/api/middleware/auditLogger.js', () => ({
  auditLogger: vi.fn(() => (_req: any, _res: any, next: any) => next()),
}));

const mockPool = { query: vi.fn() };

import ticketsRouter from '../../../../../src/api/routes/admin/tickets.routes.js';
import { supportTicketRepository } from '../../../../../src/db/repositories/supportTicket.repository.js';
import {
  mockAdminUser,
  mockRegularUser,
  mockSupportTicket,
  mockUrgentTicket,
  mockTicketMessage,
  mockAdminReply,
} from '../../../../fixtures/admin.fixtures.js';

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/', ticketsRouter);
  return app;
}

describe('Admin Tickets Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    vi.clearAllMocks();
    app = buildApp();
  });

  describe('Router Export', () => {
    it('should export an Express router', () => {
      expect(ticketsRouter).toBeDefined();
      expect(typeof ticketsRouter).toBe('function');
    });

    it('should have routes configured', () => {
      expect(ticketsRouter.stack.length).toBeGreaterThan(0);
    });
  });

  describe('GET / - List Tickets', () => {
    it('should return paginated tickets list', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket, mockUrgentTicket],
        pagination: { page: 1, limit: 20, total: 2, totalPages: 1 },
      } as any);

      const res = await request(app).get('/');

      expect(res.status).toBe(200);
      expect(res.body.tickets).toHaveLength(2);
      expect(res.body.pagination).toBeDefined();
    });

    it('should accept pagination parameters', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket, mockUrgentTicket],
        pagination: { page: 2, limit: 10, total: 25, totalPages: 3 },
      } as any);

      await request(app).get('/?page=2&limit=10');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        page: 2,
        limit: 10,
      }));
    });

    it('should apply filter for status', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get('/?status=open');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        status: 'open',
      }));
    });

    it('should apply filter for priority', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockUrgentTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get('/?priority=urgent');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'urgent',
      }));
    });

    it('should apply filter for category', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get('/?category=technical');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        category: 'technical',
      }));
    });

    it('should apply search parameter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get('/?search=API+integration');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        search: 'API integration',
      }));
    });

    it('should apply unassigned filter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get('/?unassigned=true');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        unassignedOnly: true,
      }));
    });

    it('should apply assignedTo filter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockUrgentTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      } as any);

      await request(app).get(`/?assignedTo=${mockAdminUser.id}`);

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        assignedToUserId: mockAdminUser.id,
      }));
    });

    it('should limit max limit to 100', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      } as any);

      await request(app).get('/?limit=200');

      expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
        limit: 100,
      }));
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.list).mockRejectedValue(new Error('Database error'));

      const res = await request(app).get('/');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch tickets');
    });
  });

  describe('GET /:id - Get Ticket Detail', () => {
    it('should return ticket with messages and user details', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockUrgentTicket as any);
      vi.mocked(supportTicketRepository.getMessages).mockResolvedValue([mockTicketMessage, mockAdminReply] as any);
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: mockRegularUser.id, email: mockRegularUser.email, name: mockRegularUser.name }] })
        .mockResolvedValueOnce({ rows: [{ id: 'account-001', display_name: 'Test Account', plan: 'pro' }] });

      const res = await request(app).get(`/${mockUrgentTicket.id}`);

      expect(res.status).toBe(200);
      expect(supportTicketRepository.findById).toHaveBeenCalledWith(mockUrgentTicket.id);
      expect(supportTicketRepository.getMessages).toHaveBeenCalledWith(mockUrgentTicket.id);
      expect(res.body).toMatchObject({
        ticket: expect.objectContaining({ id: mockUrgentTicket.id }),
        messages: expect.any(Array),
        user: expect.any(Object),
        account: expect.any(Object),
      });
    });

    it('should return 404 when ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null as any);

      const res = await request(app).get('/non-existent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('Ticket not found');
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.findById).mockRejectedValue(new Error('Database error'));

      const res = await request(app).get(`/${mockSupportTicket.id}`);

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch ticket details');
    });
  });

  describe('POST /:id/assign - Assign Ticket', () => {
    it('should assign ticket to specified admin', async () => {
      vi.mocked(supportTicketRepository.assign).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/assign`)
        .send({ adminId: 'admin-002' });

      expect(res.status).toBe(200);
      expect(supportTicketRepository.assign).toHaveBeenCalledWith(mockSupportTicket.id, 'admin-002');
      expect(res.body.message).toBe('Ticket assigned successfully');
    });

    it('should assign ticket to self when no adminId provided', async () => {
      vi.mocked(supportTicketRepository.assign).mockResolvedValue(undefined as any);

      await request(app)
        .post(`/${mockSupportTicket.id}/assign`)
        .send({});

      expect(supportTicketRepository.assign).toHaveBeenCalledWith(mockSupportTicket.id, mockAdminUser.id);
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.assign).mockRejectedValue(new Error('Database error'));

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/assign`)
        .send({ adminId: 'admin-002' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to assign ticket');
    });
  });

  describe('POST /:id/status - Update Ticket Status', () => {
    it('should update ticket status', async () => {
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/status`)
        .send({ status: 'in_progress' });

      expect(res.status).toBe(200);
      expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith(mockSupportTicket.id, 'in_progress');
      expect(res.body.message).toBe('Ticket status updated successfully');
    });

    it('should handle status change to resolved', async () => {
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined as any);

      await request(app)
        .post(`/${mockSupportTicket.id}/status`)
        .send({ status: 'resolved' });

      expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith(mockSupportTicket.id, 'resolved');
    });
  });

  describe('POST /:id/priority - Update Ticket Priority', () => {
    it('should update ticket priority', async () => {
      vi.mocked(supportTicketRepository.updatePriority).mockResolvedValue(undefined as any);

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/priority`)
        .send({ priority: 'high' });

      expect(res.status).toBe(200);
      expect(supportTicketRepository.updatePriority).toHaveBeenCalledWith(mockSupportTicket.id, 'high');
      expect(res.body.message).toBe('Ticket priority updated successfully');
    });
  });

  describe('POST /:id/reply - Reply to Ticket', () => {
    it('should add reply to ticket', async () => {
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue(mockAdminReply as any);

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/reply`)
        .send({ message: 'Thank you for contacting us. We are looking into this issue.' });

      expect(res.status).toBe(200);
      expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        ticketId: mockSupportTicket.id,
        userId: mockAdminUser.id,
        isStaff: true,
        message: 'Thank you for contacting us. We are looking into this issue.',
        isInternal: false,
      }));
      expect(res.body.message).toBe('Reply sent successfully');
    });
  });

  describe('POST /:id/internal-note - Add Internal Note', () => {
    it('should add internal note to ticket', async () => {
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue(mockAdminReply as any);

      const res = await request(app)
        .post(`/${mockSupportTicket.id}/internal-note`)
        .send({ note: 'This user is a high-value customer. Prioritize their request.' });

      expect(res.status).toBe(200);
      expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        ticketId: mockSupportTicket.id,
        userId: mockAdminUser.id,
        isStaff: true,
        message: 'This user is a high-value customer. Prioritize their request.',
        isInternal: true,
      }));
      expect(res.body.message).toBe('Internal note added successfully');
    });
  });
});
