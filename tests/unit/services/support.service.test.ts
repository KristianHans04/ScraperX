/**
 * Unit tests for Support Service (Phase 9)
 * 
 * Coverage: Ticket creation, rate limiting, validation, replies, knowledge base, auto-close
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/repositories/supportTicket.repository.js', () => ({
  supportTicketRepository: {
    checkRateLimit: vi.fn(),
    create: vi.fn(),
    findById: vi.fn(),
    findByTicketNumber: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    getMessages: vi.fn(),
    addMessage: vi.fn(),
    updateStatus: vi.fn(),
    getTicketsForAutoClose: vi.fn(),
  },
}));

vi.mock('../../../src/services/notification.service.js', () => ({
  notificationService: {
    notifySupportReply: vi.fn(),
    notifySupportResolved: vi.fn(),
  },
}));

import { supportService } from '../../../src/services/support.service.js';
import { supportTicketRepository } from '../../../src/db/repositories/supportTicket.repository.js';
import { notificationService } from '../../../src/services/notification.service.js';

describe('SupportService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createTicket', () => {
    const validTicketData = {
      subject: 'Test Subject',
      message: 'This is a test message with sufficient length',
      category: 'technical' as const,
      priority: 'normal' as const,
    };

    it('should create ticket with valid data', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({
        id: 'ticket-123',
        ticketNumber: 'TKT-123456',
        subject: validTicketData.subject,
      } as any);

      const result = await supportService.createTicket('user-123', 'account-123', validTicketData);

      expect(result).toBeDefined();
      expect(result.ticketNumber).toBeDefined();
      expect(supportTicketRepository.create).toHaveBeenCalled();
    });

    it('should throw error when hourly rate limit exceeded', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValueOnce(false);

      await expect(supportService.createTicket('user-123', 'account-123', validTicketData))
        .rejects.toThrow('Rate limit exceeded: Maximum 5 tickets per hour');
    });

    it('should throw error when daily rate limit exceeded', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValueOnce(true).mockResolvedValueOnce(false);

      await expect(supportService.createTicket('user-123', 'account-123', validTicketData))
        .rejects.toThrow('Rate limit exceeded: Maximum 10 tickets per day');
    });

    it('should throw error for empty subject', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);

      await expect(supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        subject: '',
      })).rejects.toThrow('Subject is required');
    });

    it('should throw error for whitespace-only subject', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);

      await expect(supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        subject: '   ',
      })).rejects.toThrow('Subject is required');
    });

    it('should throw error for empty message', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);

      await expect(supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        message: '',
      })).rejects.toThrow('Message is required');
    });

    it('should throw error for whitespace-only message', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);

      await expect(supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        message: '   ',
      })).rejects.toThrow('Message is required');
    });

    it('should throw error for subject exceeding 200 characters', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);

      await expect(supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        subject: 'a'.repeat(201),
      })).rejects.toThrow('Subject must be 200 characters or less');
    });

    it('should accept subject at exactly 200 characters', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({ id: 'ticket-123' } as any);

      await supportService.createTicket('user-123', 'account-123', {
        ...validTicketData,
        subject: 'a'.repeat(200),
      });

      expect(supportTicketRepository.create).toHaveBeenCalled();
    });

    it('should trim subject and message', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({ id: 'ticket-123' } as any);

      await supportService.createTicket('user-123', 'account-123', {
        subject: '  Test Subject  ',
        message: '  Test message content  ',
        category: 'technical',
      });

      expect(supportTicketRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        subject: 'Test Subject',
        initialMessage: 'Test message content',
      }));
    });

    it('should use default priority when not provided', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({ id: 'ticket-123' } as any);

      await supportService.createTicket('user-123', 'account-123', {
        subject: 'Test Subject',
        message: 'Test message',
        category: 'billing',
      });

      expect(supportTicketRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        priority: 'normal',
      }));
    });

    it('should accept all valid categories', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({ id: 'ticket-123' } as any);

      const categories = ['billing', 'technical', 'feature_request', 'bug_report', 'account', 'other'] as const;

      for (const category of categories) {
        await supportService.createTicket('user-123', 'account-123', {
          ...validTicketData,
          category,
        });
      }

      expect(supportTicketRepository.create).toHaveBeenCalledTimes(categories.length);
    });

    it('should accept all valid priorities', async () => {
      vi.mocked(supportTicketRepository.checkRateLimit).mockResolvedValue(true);
      vi.mocked(supportTicketRepository.create).mockResolvedValue({ id: 'ticket-123' } as any);

      const priorities = ['low', 'normal', 'high', 'urgent'] as const;

      for (const priority of priorities) {
        await supportService.createTicket('user-123', 'account-123', {
          ...validTicketData,
          priority,
        });
      }

      expect(supportTicketRepository.create).toHaveBeenCalledTimes(priorities.length);
    });
  });

  describe('getTickets', () => {
    it('should return paginated tickets', async () => {
      const mockResult = {
        data: [{ id: 'ticket-1' }, { id: 'ticket-2' }],
        pagination: { page: 1, limit: 10, total: 2 },
      };
      vi.mocked(supportTicketRepository.findByUserIdPaginated).mockResolvedValue(mockResult as any);

      const result = await supportService.getTickets('user-123', { page: 1, limit: 10 });

      expect(result).toEqual(mockResult);
    });

    it('should apply status filter', async () => {
      const mockResult = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
      vi.mocked(supportTicketRepository.findByUserIdPaginated).mockResolvedValue(mockResult as any);

      await supportService.getTickets('user-123', { page: 1, limit: 10 }, { status: 'open' });

      expect(supportTicketRepository.findByUserIdPaginated).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 10 },
        { status: 'open' }
      );
    });

    it('should apply category filter', async () => {
      const mockResult = { data: [], pagination: { page: 1, limit: 10, total: 0 } };
      vi.mocked(supportTicketRepository.findByUserIdPaginated).mockResolvedValue(mockResult as any);

      await supportService.getTickets('user-123', { page: 1, limit: 10 }, { category: 'billing' });

      expect(supportTicketRepository.findByUserIdPaginated).toHaveBeenCalledWith(
        'user-123',
        { page: 1, limit: 10 },
        { category: 'billing' }
      );
    });
  });

  describe('getTicket', () => {
    it('should return ticket if found and authorized', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      const result = await supportService.getTicket('ticket-123', 'user-123');

      expect(result).toEqual(mockTicket);
    });

    it('should return null if ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null);

      const result = await supportService.getTicket('ticket-123', 'user-123');

      expect(result).toBeNull();
    });

    it('should throw error if ticket belongs to different user', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-456' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      await expect(supportService.getTicket('ticket-123', 'user-123'))
        .rejects.toThrow('Unauthorized: Cannot access this ticket');
    });
  });

  describe('getTicketByNumber', () => {
    it('should return ticket by ticket number', async () => {
      const mockTicket = { id: 'ticket-123', ticketNumber: 'TKT-123456', userId: 'user-123' };
      vi.mocked(supportTicketRepository.findByTicketNumber).mockResolvedValue(mockTicket as any);

      const result = await supportService.getTicketByNumber('TKT-123456', 'user-123');

      expect(result).toEqual(mockTicket);
    });

    it('should throw error for unauthorized access by ticket number', async () => {
      const mockTicket = { id: 'ticket-123', ticketNumber: 'TKT-123456', userId: 'user-456' };
      vi.mocked(supportTicketRepository.findByTicketNumber).mockResolvedValue(mockTicket as any);

      await expect(supportService.getTicketByNumber('TKT-123456', 'user-123'))
        .rejects.toThrow('Unauthorized: Cannot access this ticket');
    });
  });

  describe('getTicketMessages', () => {
    it('should return messages for authorized ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123' };
      const mockMessages = [{ id: 'msg-1' }, { id: 'msg-2' }];
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.getMessages).mockResolvedValue(mockMessages as any);

      const result = await supportService.getTicketMessages('ticket-123', 'user-123');

      expect(result).toEqual(mockMessages);
    });

    it('should throw error if ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null);

      await expect(supportService.getTicketMessages('ticket-123', 'user-123'))
        .rejects.toThrow('Ticket not found');
    });
  });

  describe('replyToTicket', () => {
    const validReplyData = {
      message: 'This is a reply message',
    };

    it('should add reply to open ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open', ticketNumber: 'TKT-123' };
      const mockMessage = { id: 'msg-123', message: validReplyData.message };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue(mockMessage as any);
      vi.mocked(notificationService.notifySupportReply).mockResolvedValue(undefined);

      const result = await supportService.replyToTicket('ticket-123', 'user-123', validReplyData);

      expect(result).toEqual(mockMessage);
      expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        ticketId: 'ticket-123',
        userId: 'user-123',
        isStaff: false,
        message: validReplyData.message,
      }));
    });

    it('should throw error when replying to closed ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'closed' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      await expect(supportService.replyToTicket('ticket-123', 'user-123', validReplyData))
        .rejects.toThrow('Cannot reply to closed ticket');
    });

    it('should throw error for empty reply message', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      await expect(supportService.replyToTicket('ticket-123', 'user-123', { message: '' }))
        .rejects.toThrow('Message is required');
    });

    it('should trim reply message', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open', ticketNumber: 'TKT-123' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue({ id: 'msg-123' } as any);

      await supportService.replyToTicket('ticket-123', 'user-123', { message: '  Reply message  ' });

      expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        message: 'Reply message',
      }));
    });

    it('should include attachments when provided', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open', ticketNumber: 'TKT-123' };
      const attachments = [{ filename: 'screenshot.png', url: '/uploads/file.png', size: 1024, type: 'image/png' }];
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue({ id: 'msg-123' } as any);

      await supportService.replyToTicket('ticket-123', 'user-123', {
        message: 'See attached',
        attachments,
      });

      expect(supportTicketRepository.addMessage).toHaveBeenCalledWith(expect.objectContaining({
        attachments,
      }));
    });

    it('should send notification after reply', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open', ticketNumber: 'TKT-456' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.addMessage).mockResolvedValue({ id: 'msg-123' } as any);

      await supportService.replyToTicket('ticket-123', 'user-123', validReplyData);

      expect(notificationService.notifySupportReply).toHaveBeenCalledWith('user-123', 'TKT-456', false);
    });
  });

  describe('resolveTicket', () => {
    it('should resolve open ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open', ticketNumber: 'TKT-456' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);
      vi.mocked(notificationService.notifySupportResolved).mockResolvedValue(undefined);

      await supportService.resolveTicket('ticket-123', 'user-123');

      expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith('ticket-123', 'resolved', 'user-123');
      expect(notificationService.notifySupportResolved).toHaveBeenCalledWith('user-123', 'TKT-456');
    });

    it('should throw error if ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null);

      await expect(supportService.resolveTicket('ticket-123', 'user-123'))
        .rejects.toThrow('Ticket not found');
    });

    it('should throw error if ticket already closed', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'closed' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      await expect(supportService.resolveTicket('ticket-123', 'user-123'))
        .rejects.toThrow('Ticket is already closed');
    });
  });

  describe('reopenTicket', () => {
    it('should reopen resolved ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'resolved' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);

      await supportService.reopenTicket('ticket-123', 'user-123');

      expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith('ticket-123', 'open');
    });

    it('should reopen closed ticket', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'closed' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);

      await supportService.reopenTicket('ticket-123', 'user-123');

      expect(supportTicketRepository.updateStatus).toHaveBeenCalledWith('ticket-123', 'open');
    });

    it('should throw error if ticket is already open', async () => {
      const mockTicket = { id: 'ticket-123', userId: 'user-123', status: 'open' };
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(mockTicket as any);

      await expect(supportService.reopenTicket('ticket-123', 'user-123'))
        .rejects.toThrow('Can only reopen resolved or closed tickets');
    });

    it('should throw error if ticket not found', async () => {
      vi.mocked(supportTicketRepository.findById).mockResolvedValue(null);

      await expect(supportService.reopenTicket('ticket-123', 'user-123'))
        .rejects.toThrow('Ticket not found');
    });
  });

  describe('searchKnowledgeBase', () => {
    it('should return all articles when query is empty', async () => {
      const result = await supportService.searchKnowledgeBase('');

      expect(result.length).toBeGreaterThan(0);
      expect(result.length).toBeLessThanOrEqual(3);
    });

    it('should return matching articles for search query', async () => {
      const result = await supportService.searchKnowledgeBase('billing');

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title.toLowerCase()).toContain('billing');
    });

    it('should score title matches higher', async () => {
      const result = await supportService.searchKnowledgeBase('API');

      // Articles with "API" in title should be first
      const apiAuthIndex = result.findIndex(a => a.slug === 'api-authentication');
      const rateLimitsIndex = result.findIndex(a => a.slug === 'rate-limits');

      if (apiAuthIndex !== -1 && rateLimitsIndex !== -1) {
        expect(apiAuthIndex).toBeLessThan(rateLimitsIndex);
      }
    });

    it('should score excerpt matches lower than title', async () => {
      const result = await supportService.searchKnowledgeBase('credits');

      // Should return billing article which mentions credits in excerpt
      const billingArticle = result.find(a => a.slug === 'billing-credits');
      expect(billingArticle).toBeDefined();
    });

    it('should return empty array for non-matching query', async () => {
      const result = await supportService.searchKnowledgeBase('xyznonexistent');

      expect(result).toEqual([]);
    });

    it('should be case insensitive', async () => {
      const resultLower = await supportService.searchKnowledgeBase('billing');
      const resultUpper = await supportService.searchKnowledgeBase('BILLING');

      expect(resultLower.length).toBe(resultUpper.length);
    });

    it('should handle multi-word queries', async () => {
      const result = await supportService.searchKnowledgeBase('getting started');

      expect(result.length).toBeGreaterThan(0);
    });

    it('should limit results to 5 articles', async () => {
      // "scraping" should match multiple articles
      const result = await supportService.searchKnowledgeBase('scraping');

      expect(result.length).toBeLessThanOrEqual(5);
    });

    it('should include relevance score', async () => {
      const result = await supportService.searchKnowledgeBase('API');

      if (result.length > 0) {
        expect(result[0].relevanceScore).toBeDefined();
        expect(typeof result[0].relevanceScore).toBe('number');
        expect(result[0].relevanceScore).toBeGreaterThan(0);
      }
    });

    it('should sort by relevance score descending', async () => {
      const result = await supportService.searchKnowledgeBase('API');

      if (result.length > 1) {
        for (let i = 0; i < result.length - 1; i++) {
          expect(result[i].relevanceScore).toBeGreaterThanOrEqual(result[i + 1].relevanceScore!);
        }
      }
    });
  });

  describe('autoCloseTickets', () => {
    it('should close tickets ready for auto-close', async () => {
      const mockTickets = [
        { id: 'ticket-1', status: 'resolved' },
        { id: 'ticket-2', status: 'waiting_user' },
      ];
      vi.mocked(supportTicketRepository.getTicketsForAutoClose).mockResolvedValue(mockTickets as any);
      vi.mocked(supportTicketRepository.updateStatus).mockResolvedValue(undefined);

      const count = await supportService.autoCloseTickets();

      expect(count).toBe(2);
      expect(supportTicketRepository.updateStatus).toHaveBeenCalledTimes(2);
    });

    it('should return 0 when no tickets to close', async () => {
      vi.mocked(supportTicketRepository.getTicketsForAutoClose).mockResolvedValue([]);

      const count = await supportService.autoCloseTickets();

      expect(count).toBe(0);
      expect(supportTicketRepository.updateStatus).not.toHaveBeenCalled();
    });

    it('should call repository with correct days parameters', async () => {
      vi.mocked(supportTicketRepository.getTicketsForAutoClose).mockResolvedValue([]);

      await supportService.autoCloseTickets();

      expect(supportTicketRepository.getTicketsForAutoClose).toHaveBeenCalledWith(7, 30);
    });
  });
});
