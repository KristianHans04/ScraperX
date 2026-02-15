/**
 * Unit tests for admin tickets routes
 * Phase 10: Admin Dashboard - Support Ticket Administration
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express, { Request, Response, NextFunction } from 'express';

// Mock dependencies
vi.mock('../../../src/db/connection', () => ({
  getPool: vi.fn(() => mockPool),
}));

vi.mock('../../../src/db/repositories/supportTicket.repository', () => ({
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

vi.mock('../../../src/api/middleware/auditLogger', () => ({
  auditLogger: vi.fn((options: any) => (req: Request, res: Response, next: NextFunction) => next()),
}));

import ticketsRouter from '../../../src/api/routes/admin/tickets.routes.js';
import { supportTicketRepository } from '../../../src/db/repositories/supportTicket.repository.js';
import { getPool } from '../../../src/db/connection.js';
import { 
  mockAdminUser, 
  mockRegularUser, 
  mockSupportTicket, 
  mockUrgentTicket, 
  mockTicketMessage,
  mockAdminReply,
  createMockRequest,
  createMockResponse,
} from '../../fixtures/admin.fixtures.js';

const mockPool = {
  query: vi.fn(),
};

describe('Admin Tickets Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Router Export', () => {
    it('should export an Express router', () => {
      expect(ticketsRouter).toBeDefined();
      expect(typeof ticketsRouter).toBe('function');
      expect(ticketsRouter.stack).toBeDefined();
    });

    it('should have routes configured', () => {
      expect(ticketsRouter.stack.length).toBeGreaterThan(0);
    });
  });

  describe('GET / - List Tickets', () => {
    it('should be configured in router stack', () => {
      const getRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );
      expect(getRoute).toBeDefined();
    });

    it('should accept pagination parameters', async () => {
      const mockTickets = [mockSupportTicket, mockUrgentTicket];
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: mockTickets,
        pagination: {
          page: 2,
          limit: 10,
          total: 25,
          totalPages: 3,
        },
      });

      const req = createMockRequest({
        query: { page: '2', limit: '10' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          page: 2,
          limit: 10,
        }));
      }
    });

    it('should apply filter for status', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { status: 'open' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          status: 'open',
        }));
      }
    });

    it('should apply filter for priority', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockUrgentTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { priority: 'urgent' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          priority: 'urgent',
        }));
      }
    });

    it('should apply filter for category', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { category: 'technical' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          category: 'technical',
        }));
      }
    });

    it('should apply search parameter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { search: 'API integration' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          search: 'API integration',
        }));
      }
    });

    it('should apply unassigned filter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockSupportTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { unassigned: 'true' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          unassignedOnly: true,
        }));
      }
    });

    it('should apply assignedTo filter', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [mockUrgentTicket],
        pagination: { page: 1, limit: 20, total: 1, totalPages: 1 },
      });

      const req = createMockRequest({
        query: { assignedTo: mockAdminUser.id },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          assignedToUserId: mockAdminUser.id,
        }));
      }
    });

    it('should limit max limit to 100', async () => {
      vi.mocked(supportTicketRepository.list).mockResolvedValue({
        items: [],
        pagination: { page: 1, limit: 100, total: 0, totalPages: 0 },
      });

      const req = createMockRequest({
        query: { limit: '200' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.list).toHaveBeenCalledWith(expect.objectContaining({
          limit: 100,
        }));
      }
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.list).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({ user: mockAdminUser });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch tickets' });
      }
    });
  });

  describe('GET /:id - Get Ticket Detail', () => {
    it('should be configured in router stack', () => {
      const getRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );
      expect(getRoute).toBeDefined();
    });

    it('should return ticket with messages and user details', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockUrgentTicket);
      vi.mocked(supportTicketRepository.getMessages).mockResolvedValue([mockTicketMessage, mockAdminReply]);
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: mockRegularUser.id, email: mockRegularUser.email, name: mockRegularUser.name }],
      });
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 'account-001', display_name: 'Test Account', plan: 'pro' }],
      });

      const req = createMockRequest({
        params: { id: mockUrgentTicket.id },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.findById).toHaveBeenCalledWith(mockUrgentTicket.id);
        expect(supportTicketRepository.getMessages).toHaveBeenCalledWith(mockUrgentTicket.id);
        expect(mockPool.query).toHaveBeenCalledWith(
          'SELECT id, email, name FROM users WHERE id = $1',
          [mockUrgentTicket.userId]
        );
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
          ticket: mockUrgentTicket,
          messages: [mockTicketMessage, mockAdminReply],
        }));
      }
    });

    it('should return 404 when ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null);

      const req = createMockRequest({
        params: { id: 'non-existent' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(404);
        expect(res.json).toHaveBeenCalledWith({ error: 'Ticket not found' });
      }
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.findById).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id' && layer.route.methods.get
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to fetch ticket details' });
      }
    });
  });

  describe('POST /:id/assign - Assign Ticket', () => {
    it('should be configured in router stack', () => {
      const postRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/assign' && layer.route.methods.post
      );
      expect(postRoute).toBeDefined();
    });

    it('should assign ticket to specified admin', async () => {
      vi.mocked(supportTicketRepository.assign).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { adminId: 'admin-002' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/assign' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.assign).toHaveBeenCalledWith(mockSupportTicket.id, 'admin-002');
        expect(res.json).toHaveBeenCalledWith({ message: 'Ticket assigned successfully' });
      }
    });

    it('should assign ticket to self when no adminId provided', async () => {
      vi.mocked(supportTicketRepository.assign).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: {},
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/assign' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.assign).toHaveBeenCalledWith(mockSupportTicket.id, mockAdminUser.id);
      }
    });

    it('should return 500 on database error', async () => {
      vi.mocked(supportTicketRepository.assign).mockRejectedValue(new Error('Database error'));

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { adminId: 'admin-002' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/assign' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(res.status).toHaveBeenCalledWith(500);
        expect(res.json).toHaveBeenCalledWith({ error: 'Failed to assign ticket' });
      }
    });
  });

  describe('POST /:id/status - Update Ticket Status', () => {
    it('should be configured in router stack', () => {
      const postRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/status' && layer.route.methods.post
      );
      expect(postRoute).toBeDefined();
    });

    it('should update ticket status', async () => {
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { status: 'in_progress' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/status' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith(mockSupportTicket.id, 'in_progress');
        expect(res.json).toHaveBeenCalledWith({ message: 'Ticket status updated successfully' });
      }
    });

    it('should handle status change to resolved', async () => {
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { status: 'resolved' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/status' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith(mockSupportTicket.id, 'resolved');
      }
    });
  });

  describe('POST /:id/priority - Update Ticket Priority', () => {
    it('should be configured in router stack', () => {
      const postRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/priority' && layer.route.methods.post
      );
      expect(postRoute).toBeDefined();
    });

    it('should update ticket priority', async () => {
      vi.mocked(supportTicketRepository.updatePriority).mockResolvedValue(undefined);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { priority: 'high' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/priority' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.updatePriority).toHaveBeenCalledWith(mockSupportTicket.id, 'high');
        expect(res.json).toHaveBeenCalledWith({ message: 'Ticket priority updated successfully' });
      }
    });
  });

  describe('POST /:id/reply - Reply to Ticket', () => {
    it('should be configured in router stack', () => {
      const postRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/reply' && layer.route.methods.post
      );
      expect(postRoute).toBeDefined();
    });

    it('should add reply to ticket', async () => {
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue(mockAdminReply);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { message: 'Thank you for contacting us. We are looking into this issue.' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/reply' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
          ticketId: mockSupportTicket.id,
          userId: mockAdminUser.id,
          isStaff: true,
          message: 'Thank you for contacting us. We are looking into this issue.',
          isInternal: false,
        }));
        expect(res.json).toHaveBeenCalledWith({ message: 'Reply sent successfully' });
      }
    });
  });

  describe('POST /:id/internal-note - Add Internal Note', () => {
    it('should be configured in router stack', () => {
      const postRoute = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/internal-note' && layer.route.methods.post
      );
      expect(postRoute).toBeDefined();
    });

    it('should add internal note to ticket', async () => {
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue(mockAdminReply);

      const req = createMockRequest({
        params: { id: mockSupportTicket.id },
        body: { note: 'This user is a high-value customer. Prioritize their request.' },
        user: mockAdminUser,
      });
      const res = createMockResponse();

      const route = ticketsRouter.stack.find((layer: any) => 
        layer.route && layer.route.path === '/:id/internal-note' && layer.route.methods.post
      );

      if (route && route.route) {
        const handler = route.route.stack[route.route.stack.length - 1].handle;
        await handler(req, res, vi.fn());

        expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
          ticketId: mockSupportTicket.id,
          userId: mockAdminUser.id,
          isStaff: true,
          message: 'This user is a high-value customer. Prioritize their request.',
          isInternal: true,
        }));
        expect(res.json).toHaveBeenCalledWith({ message: 'Internal note added successfully' });
      }
    });
  });
});
