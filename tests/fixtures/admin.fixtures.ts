/**
 * Phase 10 Admin Test Fixtures for Scrapifie
 * 
 * Provides mock data for admin dashboard testing.
 */

import type { 
  AuditLog,
  SupportTicket,
  SupportTicketMessage,
  AbuseFlag,
  RefundRequest,
  BlogPost,
  ServiceStatusConfig,
  StatusIncident,
  StatusIncidentUpdate,
  SystemConfiguration,
  User,
  Account,
} from '../../src/types/index.js';

// ==================== Admin User Fixtures ====================

export const mockAdminUser: User = {
  id: 'admin-0001',
  email: 'admin@scrapifie.com',
  name: 'Admin User',
  role: 'admin',
  emailVerified: true,
  accountId: 'account-admin-001',
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  lastLoginAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockRegularUser: User = {
  id: 'user-0001',
  email: 'user@example.com',
  name: 'Regular User',
  role: 'user',
  emailVerified: true,
  accountId: 'account-user-001',
  createdAt: new Date('2024-01-05T00:00:00Z'),
  updatedAt: new Date('2024-01-05T00:00:00Z'),
  lastLoginAt: new Date('2024-01-14T15:30:00Z'),
};

export const mockSuspendedUser: User = {
  id: 'user-0002',
  email: 'suspended@example.com',
  name: 'Suspended User',
  role: 'user',
  emailVerified: true,
  accountId: 'account-suspended-001',
  createdAt: new Date('2024-01-03T00:00:00Z'),
  updatedAt: new Date('2024-01-10T00:00:00Z'),
  lastLoginAt: new Date('2024-01-09T12:00:00Z'),
};

// ==================== Audit Log Fixtures ====================

export const mockAuditLog: AuditLog = {
  id: 'audit-0001',
  adminId: mockAdminUser.id,
  adminEmail: mockAdminUser.email,
  action: 'user.suspend',
  category: 'user_management',
  resourceType: 'user',
  resourceId: mockRegularUser.id,
  details: { reason: 'Terms of service violation' },
  ipAddress: '192.168.1.100',
  userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
  createdAt: new Date('2024-01-15T10:30:00Z'),
};

export const mockAuditLogFinancial: AuditLog = {
  id: 'audit-0002',
  adminId: mockAdminUser.id,
  adminEmail: mockAdminUser.email,
  action: 'credits.adjust',
  category: 'financial',
  resourceType: 'account',
  resourceId: 'account-user-001',
  details: { amount: 5000, reason: 'Goodwill gesture' },
  ipAddress: '192.168.1.100',
  createdAt: new Date('2024-01-15T11:00:00Z'),
};

export const mockAuditLogSupport: AuditLog = {
  id: 'audit-0003',
  adminId: mockAdminUser.id,
  adminEmail: mockAdminUser.email,
  action: 'ticket.reply',
  category: 'support',
  resourceType: 'ticket',
  resourceId: 'ticket-0001',
  details: { messageLength: 150 },
  ipAddress: '192.168.1.100',
  createdAt: new Date('2024-01-15T12:00:00Z'),
};

export function createMockAuditLog(overrides?: Partial<AuditLog>): AuditLog {
  return { ...mockAuditLog, ...overrides };
}

// ==================== Support Ticket Fixtures ====================

export const mockSupportTicket: SupportTicket = {
  id: 'ticket-0001',
  ticketNumber: 'TKT-2024-0001',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  subject: 'Need help with API integration',
  category: 'technical',
  priority: 'normal',
  status: 'open',
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
};

export const mockUrgentTicket: SupportTicket = {
  id: 'ticket-0002',
  ticketNumber: 'TKT-2024-0002',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  subject: 'Account access blocked',
  category: 'account',
  priority: 'urgent',
  status: 'in_progress',
  assignedTo: mockAdminUser.id,
  assignedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T08:30:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockResolvedTicket: SupportTicket = {
  id: 'ticket-0003',
  ticketNumber: 'TKT-2024-0003',
  userId: mockSuspendedUser.id,
  accountId: mockSuspendedUser.accountId,
  subject: 'Billing inquiry',
  category: 'billing',
  priority: 'low',
  status: 'resolved',
  assignedTo: mockAdminUser.id,
  assignedAt: new Date('2024-01-14T14:00:00Z'),
  firstResponseAt: new Date('2024-01-14T14:30:00Z'),
  resolvedAt: new Date('2024-01-14T16:00:00Z'),
  createdAt: new Date('2024-01-14T13:00:00Z'),
  updatedAt: new Date('2024-01-14T16:00:00Z'),
};

export function createMockSupportTicket(overrides?: Partial<SupportTicket>): SupportTicket {
  return { ...mockSupportTicket, ...overrides };
}

// ==================== Support Ticket Message Fixtures ====================

export const mockTicketMessage: SupportTicketMessage = {
  id: 'msg-0001',
  ticketId: mockSupportTicket.id,
  authorId: mockRegularUser.id,
  authorType: 'user',
  messageType: 'user_message',
  content: 'I am having trouble integrating the API. Can you help?',
  isInternal: false,
  attachments: [],
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
};

export const mockAdminReply: SupportTicketMessage = {
  id: 'msg-0002',
  ticketId: mockSupportTicket.id,
  authorId: mockAdminUser.id,
  authorType: 'admin',
  messageType: 'admin_reply',
  content: 'I would be happy to help! What specific issue are you experiencing?',
  isInternal: false,
  attachments: [],
  createdAt: new Date('2024-01-15T10:30:00Z'),
  updatedAt: new Date('2024-01-15T10:30:00Z'),
};

export const mockInternalNote: SupportTicketMessage = {
  id: 'msg-0003',
  ticketId: mockSupportTicket.id,
  authorId: mockAdminUser.id,
  authorType: 'admin',
  messageType: 'internal_note',
  content: 'This user is on the free plan. Consider upselling.',
  isInternal: true,
  attachments: [],
  createdAt: new Date('2024-01-15T10:35:00Z'),
  updatedAt: new Date('2024-01-15T10:35:00Z'),
};

export function createMockTicketMessage(overrides?: Partial<SupportTicketMessage>): SupportTicketMessage {
  return { ...mockTicketMessage, ...overrides };
}

// ==================== Abuse Flag Fixtures ====================

export const mockAbuseFlag: AbuseFlag = {
  id: 'abuse-0001',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  signalType: 'high_credit_consumption',
  severity: 'medium',
  status: 'active',
  detectedAt: new Date('2024-01-15T08:00:00Z'),
  thresholdValue: 10000,
  actualValue: 15000,
  evidence: {
    timeWindow: '1 hour',
    jobIds: ['job-001', 'job-002', 'job-003'],
    urls: ['https://example1.com', 'https://example2.com'],
  },
  createdAt: new Date('2024-01-15T08:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
};

export const mockCriticalAbuseFlag: AbuseFlag = {
  id: 'abuse-0002',
  userId: mockSuspendedUser.id,
  accountId: mockSuspendedUser.accountId,
  signalType: 'failed_request_pattern',
  severity: 'critical',
  status: 'investigating',
  detectedAt: new Date('2024-01-15T07:00:00Z'),
  thresholdValue: 80,
  actualValue: 95,
  evidence: {
    failureRate: 0.95,
    totalRequests: 200,
    failedRequests: 190,
    targetUrls: ['https://blocked-site.com'],
  },
  investigatedBy: mockAdminUser.id,
  investigatedAt: new Date('2024-01-15T09:00:00Z'),
  createdAt: new Date('2024-01-15T07:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
};

export const mockResolvedAbuseFlag: AbuseFlag = {
  id: 'abuse-0003',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  signalType: 'rapid_api_key_creation',
  severity: 'low',
  status: 'false_positive',
  detectedAt: new Date('2024-01-14T10:00:00Z'),
  thresholdValue: 5,
  actualValue: 7,
  evidence: {
    apiKeysCreated: 7,
    timeWindow: '1 day',
  },
  investigatedBy: mockAdminUser.id,
  investigatedAt: new Date('2024-01-14T11:00:00Z'),
  resolutionNote: 'User was legitimately testing different environments',
  resolvedAt: new Date('2024-01-14T12:00:00Z'),
  createdAt: new Date('2024-01-14T10:00:00Z'),
  updatedAt: new Date('2024-01-14T12:00:00Z'),
};

export function createMockAbuseFlag(overrides?: Partial<AbuseFlag>): AbuseFlag {
  return { ...mockAbuseFlag, ...overrides };
}

// ==================== Refund Request Fixtures ====================

export const mockRefundRequest: RefundRequest = {
  id: 'refund-0001',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  invoiceId: 'invoice-0001',
  refundType: 'full',
  status: 'pending',
  originalAmount: 9900,
  refundAmount: 9900,
  reason: 'Service not as expected',
  userNotes: 'I would like a full refund as the service did not meet my requirements.',
  createdAt: new Date('2024-01-15T08:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
};

export const mockPartialRefundRequest: RefundRequest = {
  id: 'refund-0002',
  userId: mockSuspendedUser.id,
  accountId: mockSuspendedUser.accountId,
  invoiceId: 'invoice-0002',
  refundType: 'partial',
  status: 'approved',
  originalAmount: 9900,
  refundAmount: 5000,
  reason: 'Partial usage',
  userNotes: 'I only used the service for half the month.',
  reviewedBy: mockAdminUser.id,
  reviewedAt: new Date('2024-01-15T10:00:00Z'),
  adminNotes: 'Approved partial refund based on prorated usage.',
  approvedAt: new Date('2024-01-15T10:00:00Z'),
  createdAt: new Date('2024-01-15T09:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockDeniedRefundRequest: RefundRequest = {
  id: 'refund-0003',
  userId: mockRegularUser.id,
  accountId: mockRegularUser.accountId,
  invoiceId: 'invoice-0003',
  refundType: 'full',
  status: 'denied',
  originalAmount: 9900,
  refundAmount: 0,
  reason: 'Changed mind',
  userNotes: 'I changed my mind about the subscription.',
  reviewedBy: mockAdminUser.id,
  reviewedAt: new Date('2024-01-14T16:00:00Z'),
  adminNotes: 'Refund policy does not cover change of mind after 14 days.',
  createdAt: new Date('2024-01-14T15:00:00Z'),
  updatedAt: new Date('2024-01-14T16:00:00Z'),
};

export function createMockRefundRequest(overrides?: Partial<RefundRequest>): RefundRequest {
  return { ...mockRefundRequest, ...overrides };
}

// ==================== Blog Post Fixtures ====================

export const mockBlogPost: BlogPost = {
  id: 'blog-0001',
  title: 'Getting Started with Web Scraping',
  slug: 'getting-started-web-scraping',
  excerpt: 'Learn the basics of web scraping and how to use Scrapifie effectively.',
  content: '# Getting Started with Web Scraping\n\nWeb scraping is a powerful technique...',
  featuredImageUrl: 'https://cdn.scrapifie.com/images/blog-0001.jpg',
  featuredImageAlt: 'Web scraping illustration',
  tags: ['tutorial', 'beginner', 'web-scraping'],
  metaTitle: 'Getting Started with Web Scraping - Scrapifie',
  metaDescription: 'Learn the basics of web scraping with our comprehensive guide.',
  ogImageUrl: 'https://cdn.scrapifie.com/images/blog-0001-og.jpg',
  status: 'published',
  authorId: mockAdminUser.id,
  publishedAt: new Date('2024-01-10T10:00:00Z'),
  createdAt: new Date('2024-01-08T14:00:00Z'),
  updatedAt: new Date('2024-01-10T10:00:00Z'),
};

export const mockDraftBlogPost: BlogPost = {
  id: 'blog-0002',
  title: 'Advanced Scraping Techniques',
  slug: 'advanced-scraping-techniques',
  excerpt: 'Master advanced web scraping patterns and anti-detection methods.',
  content: '# Advanced Scraping Techniques\n\nIn this guide, we will explore...',
  tags: ['advanced', 'tutorial', 'anti-detection'],
  status: 'draft',
  authorId: mockAdminUser.id,
  createdAt: new Date('2024-01-14T16:00:00Z'),
  updatedAt: new Date('2024-01-14T16:00:00Z'),
};

export const mockArchivedBlogPost: BlogPost = {
  id: 'blog-0003',
  title: 'Deprecated: Old API v1 Guide',
  slug: 'old-api-v1-guide',
  excerpt: 'This guide is for the deprecated API v1.',
  content: '# Old API v1 Guide\n\nThis API version is no longer supported...',
  tags: ['deprecated', 'api-v1'],
  status: 'archived',
  authorId: mockAdminUser.id,
  publishedAt: new Date('2023-06-01T10:00:00Z'),
  createdAt: new Date('2023-06-01T10:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export function createMockBlogPost(overrides?: Partial<BlogPost>): BlogPost {
  return { ...mockBlogPost, ...overrides };
}

// ==================== Status Page Fixtures ====================

export const mockServiceStatusConfig: ServiceStatusConfig = {
  id: 'svc-0001',
  serviceName: 'api',
  serviceDisplayName: 'API',
  description: 'REST API endpoints',
  status: 'operational',
  displayOrder: 1,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T10:00:00Z'),
};

export const mockDegradedService: ServiceStatusConfig = {
  id: 'svc-0002',
  serviceName: 'browser_engine',
  serviceDisplayName: 'Browser Engine',
  description: 'Headless browser scraping',
  status: 'degraded_performance',
  displayOrder: 2,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T09:30:00Z'),
};

export const mockDownService: ServiceStatusConfig = {
  id: 'svc-0003',
  serviceName: 'stealth_engine',
  serviceDisplayName: 'Stealth Engine',
  description: 'Anti-detection scraping',
  status: 'major_outage',
  displayOrder: 3,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
};

export const mockStatusIncident: StatusIncident = {
  id: 'incident-0001',
  title: 'Stealth Engine Outage',
  status: 'investigating',
  severity: 'high',
  affectedServices: ['stealth_engine'],
  startedAt: new Date('2024-01-15T08:00:00Z'),
  createdBy: mockAdminUser.id,
  createdAt: new Date('2024-01-15T08:00:00Z'),
  updatedAt: new Date('2024-01-15T08:00:00Z'),
};

export const mockResolvedIncident: StatusIncident = {
  id: 'incident-0002',
  title: 'API Latency Issues',
  status: 'resolved',
  severity: 'medium',
  affectedServices: ['api'],
  startedAt: new Date('2024-01-14T14:00:00Z'),
  resolvedAt: new Date('2024-01-14T16:30:00Z'),
  createdBy: mockAdminUser.id,
  createdAt: new Date('2024-01-14T14:00:00Z'),
  updatedAt: new Date('2024-01-14T16:30:00Z'),
};

export const mockIncidentUpdate: StatusIncidentUpdate = {
  id: 'update-0001',
  incidentId: mockStatusIncident.id,
  message: 'We are investigating reports of connectivity issues with the Stealth Engine.',
  status: 'investigating',
  createdBy: mockAdminUser.id,
  createdAt: new Date('2024-01-15T08:00:00Z'),
};

// ==================== System Configuration Fixtures ====================

export const mockSystemConfig: SystemConfiguration = {
  id: 'config-0001',
  configKey: 'max_jobs_per_minute',
  valueType: 'number',
  value: '60',
  category: 'limits',
  description: 'Maximum number of scrape jobs allowed per minute per account',
  isSecret: false,
  isCritical: true,
  validationRegex: '^[0-9]+$',
  minValue: 1,
  maxValue: 1000,
  lastModifiedBy: mockAdminUser.id,
  lastModifiedAt: new Date('2024-01-10T14:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-10T14:00:00Z'),
};

export const mockStringConfig: SystemConfiguration = {
  id: 'config-0002',
  configKey: 'support_email',
  valueType: 'string',
  value: 'support@scrapifie.com',
  category: 'general',
  description: 'Primary support email address',
  isSecret: false,
  isCritical: false,
  lastModifiedBy: mockAdminUser.id,
  lastModifiedAt: new Date('2024-01-05T10:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-05T10:00:00Z'),
};

export const mockBooleanConfig: SystemConfiguration = {
  id: 'config-0003',
  configKey: 'maintenance_mode',
  valueType: 'boolean',
  value: 'false',
  category: 'maintenance',
  description: 'Enable maintenance mode for the platform',
  isSecret: false,
  isCritical: true,
  allowedValues: ['true', 'false'],
  lastModifiedBy: mockAdminUser.id,
  lastModifiedAt: new Date('2024-01-15T09:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-15T09:00:00Z'),
};

export const mockJsonConfig: SystemConfiguration = {
  id: 'config-0004',
  configKey: 'rate_limits',
  valueType: 'json',
  value: '{"free":10,"pro":100,"enterprise":1000}',
  category: 'limits',
  description: 'Rate limits per plan tier (requests per minute)',
  isSecret: false,
  isCritical: true,
  lastModifiedBy: mockAdminUser.id,
  lastModifiedAt: new Date('2024-01-08T12:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-08T12:00:00Z'),
};

export const mockSecretConfig: SystemConfiguration = {
  id: 'config-0005',
  configKey: 'stripe_webhook_secret',
  valueType: 'string',
  value: 'whsec_********',
  category: 'billing',
  description: 'Stripe webhook secret for payment processing',
  isSecret: true,
  isCritical: true,
  lastModifiedBy: mockAdminUser.id,
  lastModifiedAt: new Date('2024-01-01T00:00:00Z'),
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
};

export function createMockSystemConfig(overrides?: Partial<SystemConfiguration>): SystemConfiguration {
  return { ...mockSystemConfig, ...overrides };
}

// ==================== Test Data Arrays ====================

export const mockAuditLogs: AuditLog[] = [
  mockAuditLog,
  mockAuditLogFinancial,
  mockAuditLogSupport,
];

export const mockSupportTickets: SupportTicket[] = [
  mockSupportTicket,
  mockUrgentTicket,
  mockResolvedTicket,
];

export const mockAbuseFlags: AbuseFlag[] = [
  mockAbuseFlag,
  mockCriticalAbuseFlag,
  mockResolvedAbuseFlag,
];

export const mockRefundRequests: RefundRequest[] = [
  mockRefundRequest,
  mockPartialRefundRequest,
  mockDeniedRefundRequest,
];

export const mockBlogPosts: BlogPost[] = [
  mockBlogPost,
  mockDraftBlogPost,
  mockArchivedBlogPost,
];

export const mockServiceStatuses: ServiceStatusConfig[] = [
  mockServiceStatusConfig,
  mockDegradedService,
  mockDownService,
];

export const mockSystemConfigs: SystemConfiguration[] = [
  mockSystemConfig,
  mockStringConfig,
  mockBooleanConfig,
  mockJsonConfig,
  mockSecretConfig,
];

// ==================== Factory Functions ====================

export function createMockUser(overrides?: Partial<User>): User {
  return { ...mockRegularUser, ...overrides };
}

export function createMockAdmin(overrides?: Partial<User>): User {
  return { ...mockAdminUser, ...overrides };
}

// ==================== Request/Response Mock Helpers ====================

export function createMockRequest(overrides?: any) {
  return {
    user: mockAdminUser,
    params: {},
    query: {},
    body: {},
    headers: {},
    ip: '127.0.0.1',
    get: vi.fn((header: string) => {
      const headers: Record<string, string> = {
        'user-agent': 'Mozilla/5.0 Test',
      };
      return headers[header.toLowerCase()] || undefined;
    }),
    ...overrides,
  };
}

export function createMockResponse() {
  const res: any = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    send: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
    statusCode: 200,
  };
  return res;
}

export function createMockNext() {
  return vi.fn();
}

// Import vi from vitest for mocks
import { vi } from 'vitest';
