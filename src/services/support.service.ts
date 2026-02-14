import { supportTicketRepository } from '../db/repositories/supportTicket.repository.js';
import { notificationService } from './notification.service.js';
import type {
  SupportTicket,
  SupportTicketMessage,
  CreateTicketRequest,
  TicketReplyRequest,
  TicketStatus,
  TicketCategory,
  PaginatedResult,
  PaginationParams,
  KnowledgeBaseArticle,
} from '../types/index.js';

export class SupportService {
  private readonly RATE_LIMIT_HOURLY = 5;
  private readonly RATE_LIMIT_DAILY = 10;

  async createTicket(
    userId: string,
    accountId: string,
    data: CreateTicketRequest
  ): Promise<SupportTicket> {
    const canCreate1Hour = await supportTicketRepository.checkRateLimit(
      userId,
      1,
      this.RATE_LIMIT_HOURLY
    );

    if (!canCreate1Hour) {
      throw new Error('Rate limit exceeded: Maximum 5 tickets per hour');
    }

    const canCreate24Hours = await supportTicketRepository.checkRateLimit(
      userId,
      24,
      this.RATE_LIMIT_DAILY
    );

    if (!canCreate24Hours) {
      throw new Error('Rate limit exceeded: Maximum 10 tickets per day');
    }

    if (!data.subject || data.subject.trim().length === 0) {
      throw new Error('Subject is required');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Message is required');
    }

    if (data.subject.length > 200) {
      throw new Error('Subject must be 200 characters or less');
    }

    const ticket = await supportTicketRepository.create({
      userId,
      accountId,
      subject: data.subject.trim(),
      category: data.category,
      priority: data.priority ?? 'normal',
      initialMessage: data.message.trim(),
    });

    return ticket;
  }

  async getTickets(
    userId: string,
    pagination: PaginationParams,
    filters?: { status?: TicketStatus; category?: TicketCategory }
  ): Promise<PaginatedResult<SupportTicket>> {
    return await supportTicketRepository.findByUserIdPaginated(
      userId,
      pagination,
      filters
    );
  }

  async getTicket(ticketId: string, userId: string): Promise<SupportTicket | null> {
    const ticket = await supportTicketRepository.findById(ticketId);

    if (!ticket) {
      return null;
    }

    if (ticket.userId !== userId) {
      throw new Error('Unauthorized: Cannot access this ticket');
    }

    return ticket;
  }

  async getTicketByNumber(
    ticketNumber: string,
    userId: string
  ): Promise<SupportTicket | null> {
    const ticket = await supportTicketRepository.findByTicketNumber(ticketNumber);

    if (!ticket) {
      return null;
    }

    if (ticket.userId !== userId) {
      throw new Error('Unauthorized: Cannot access this ticket');
    }

    return ticket;
  }

  async getTicketMessages(
    ticketId: string,
    userId: string
  ): Promise<SupportTicketMessage[]> {
    const ticket = await this.getTicket(ticketId, userId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    return await supportTicketRepository.getMessages(ticketId);
  }

  async replyToTicket(
    ticketId: string,
    userId: string,
    data: TicketReplyRequest
  ): Promise<SupportTicketMessage> {
    const ticket = await this.getTicket(ticketId, userId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new Error('Cannot reply to closed ticket');
    }

    if (!data.message || data.message.trim().length === 0) {
      throw new Error('Message is required');
    }

    const message = await supportTicketRepository.addMessage({
      ticketId,
      userId,
      isStaff: false,
      message: data.message.trim(),
      attachments: data.attachments ?? [],
      isInternal: false,
    });

    await notificationService.notifySupportReply(
      userId,
      ticket.ticketNumber,
      false
    );

    return message;
  }

  async resolveTicket(ticketId: string, userId: string): Promise<void> {
    const ticket = await this.getTicket(ticketId, userId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status === 'closed') {
      throw new Error('Ticket is already closed');
    }

    await supportTicketRepository.updateStatus(ticketId, 'resolved', userId);

    await notificationService.notifySupportResolved(userId, ticket.ticketNumber);
  }

  async reopenTicket(ticketId: string, userId: string): Promise<void> {
    const ticket = await this.getTicket(ticketId, userId);

    if (!ticket) {
      throw new Error('Ticket not found');
    }

    if (ticket.status !== 'resolved' && ticket.status !== 'closed') {
      throw new Error('Can only reopen resolved or closed tickets');
    }

    await supportTicketRepository.updateStatus(ticketId, 'open');
  }

  async searchKnowledgeBase(query: string): Promise<KnowledgeBaseArticle[]> {
    const articles: KnowledgeBaseArticle[] = [
      {
        id: 'kb-001',
        slug: 'getting-started',
        title: 'Getting Started with Scrapifie',
        excerpt: 'Learn how to create your first scraping job and manage API keys.',
        category: 'Getting Started',
      },
      {
        id: 'kb-002',
        slug: 'api-authentication',
        title: 'API Authentication',
        excerpt: 'How to authenticate with the Scrapifie API using API keys.',
        category: 'Technical',
      },
      {
        id: 'kb-003',
        slug: 'billing-credits',
        title: 'Understanding Credits and Billing',
        excerpt: 'Learn how credits work and how to manage your billing.',
        category: 'Billing',
      },
      {
        id: 'kb-004',
        slug: 'rate-limits',
        title: 'Rate Limits and Quotas',
        excerpt: 'Understanding rate limits and concurrent job limits for your plan.',
        category: 'Technical',
      },
      {
        id: 'kb-005',
        slug: 'scraping-engines',
        title: 'Choosing the Right Scraping Engine',
        excerpt: 'Comparison of HTTP, Browser, and Stealth engines for different use cases.',
        category: 'Technical',
      },
    ];

    if (!query || query.trim().length === 0) {
      return articles.slice(0, 3);
    }

    const searchTerms = query.toLowerCase().trim().split(' ');

    const scored = articles.map((article) => {
      const titleLower = article.title.toLowerCase();
      const excerptLower = article.excerpt.toLowerCase();
      const categoryLower = article.category.toLowerCase();

      let score = 0;

      searchTerms.forEach((term) => {
        if (titleLower.includes(term)) score += 3;
        if (excerptLower.includes(term)) score += 2;
        if (categoryLower.includes(term)) score += 1;
      });

      return { ...article, relevanceScore: score };
    });

    return scored
      .filter((article) => article.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 5);
  }

  async autoCloseTickets(): Promise<number> {
    const DAYS_AFTER_RESOLVED = 7;
    const DAYS_INACTIVE = 30;

    const ticketsToClose = await supportTicketRepository.getTicketsForAutoClose(
      DAYS_AFTER_RESOLVED,
      DAYS_INACTIVE
    );

    let closedCount = 0;

    for (const ticket of ticketsToClose) {
      await supportTicketRepository.updateStatus(ticket.id, 'closed');
      closedCount++;
    }

    return closedCount;
  }
}

export const supportService = new SupportService();
