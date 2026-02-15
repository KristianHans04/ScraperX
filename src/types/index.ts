// Core Types for Scrapifie

// Account and User Types (Phase 6)
export type PlanType = 'free' | 'pro' | 'enterprise';
export type AccountStatus = 'active' | 'restricted' | 'suspended';
export type UserRoleType = 'user' | 'admin';

export interface Account {
  id: string;
  displayName: string;
  plan: PlanType;
  creditBalance: number;
  creditCycleUsage: number;
  status: AccountStatus;
  paystackCustomerCode?: string;
  paystackSubscriptionCode?: string;
  billingEmail?: string;
  billingCycleStart?: Date;
  billingCycleEnd?: Date;
  lastPaymentAt?: Date;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface User {
  id: string;
  accountId: string;
  email: string;
  emailVerified: boolean;
  passwordHash?: string;
  name: string;
  avatarUrl?: string;
  role: UserRoleType;
  timezone: string;
  dateFormat: string;
  theme: 'light' | 'dark' | 'system';
  displayDensity: 'comfortable' | 'compact';
  lastLoginAt?: Date;
  lastLoginIp?: string;
  loginFailedCount: number;
  lockedUntil?: Date;
  termsAcceptedAt?: Date;
  termsVersion?: string;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

// Job Status
export type JobStatus = 
  | 'pending' 
  | 'queued' 
  | 'running' 
  | 'completed' 
  | 'failed' 
  | 'canceled' 
  | 'timeout';

// Scraping Engine Types
export type EngineType = 'auto' | 'http' | 'browser' | 'stealth';

// Proxy Tier Types
export type ProxyTier = 'datacenter' | 'residential' | 'mobile' | 'isp';

// User Roles
export type UserRole = 'owner' | 'admin' | 'member' | 'readonly';

// Plan IDs
export type PlanId = 'free' | 'starter' | 'growth' | 'business' | 'enterprise';

// Subscription Status
export type SubscriptionStatus = 
  | 'trialing' 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'unpaid' 
  | 'paused';

// Organization Interface
export interface Organization {
  id: string;
  name: string;
  slug: string;
  billingEmail: string;
  technicalEmail?: string;
  planId: PlanId;
  subscriptionStatus: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  creditsBalance: number;
  creditsIncludedMonthly: number;
  creditsOverageRate: number;
  rateLimitPerSecond: number;
  maxConcurrentJobs: number;
  maxBatchSize: number;
  dataRetentionDays: number;
  features: OrganizationFeatures;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
  deletedAt?: Date;
}

export interface OrganizationFeatures {
  jsRendering: boolean;
  residentialProxies: boolean;
  mobileProxies: boolean;
  captchaSolving: boolean;
  webhooks: boolean;
  batchApi: boolean;
  priorityQueue: boolean;
  dedicatedSupport: boolean;
}

// API Key Interface
export interface ApiKey {
  id: string;
  accountId: string; // Updated from organizationId for Phase 6
  createdByUserId?: string;
  keyPrefix: string;
  keyHash: string;
  name: string;
  description?: string;
  scopes: string[];
  allowedIps?: string[];
  allowedDomains?: string[];
  rateLimitOverride?: number;
  maxConcurrentOverride?: number;
  creditsLimit?: number;
  environment: 'development' | 'staging' | 'production';
  expiresAt?: Date;
  lastUsedAt?: Date;
  lastUsedIp?: string;
  lastUsedUserAgent?: string;
  usageCount: number;
  isActive: boolean;
  revokedAt?: Date;
  revokedByUserId?: string;
  revokeReason?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Scrape Job Interface
export interface ScrapeJob {
  id: string;
  accountId: string; // Updated from organizationId for Phase 6
  apiKeyId?: string;
  batchId?: string;
  parentJobId?: string;
  retryOfJobId?: string;
  url: string;
  urlHash: string;
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers: Record<string, string>;
  body?: string;
  engine: EngineType;
  options: ScrapeOptions;
  proxyTier: ProxyTier;
  proxyCountry?: string;
  proxyCity?: string;
  proxyProvider?: string;
  proxySessionId?: string;
  fingerprintId?: string;
  userAgent?: string;
  status: JobStatus;
  priority: number;
  attempts: number;
  maxAttempts: number;
  createdAt: Date;
  queuedAt?: Date;
  startedAt?: Date;
  completedAt?: Date;
  timeoutAt?: Date;
  workerId?: string;
  workerRegion?: string;
  queueName?: string;
  resultId?: string;
  creditsEstimated: number;
  creditsCharged: number;
  creditBreakdown: CreditBreakdown;
  webhookUrl?: string;
  webhookSecret?: string;
  webhookSentAt?: Date;
  webhookAttempts: number;
  webhookLastError?: string;
  errorCode?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  clientReference?: string;
  idempotencyKey?: string;
  metadata: Record<string, unknown>;
}

export interface ScrapeOptions {
  renderJs: boolean;
  waitFor?: string;
  waitMs?: number;
  timeout: number;
  screenshot: boolean;
  screenshotOptions?: ScreenshotOptions;
  pdf: boolean;
  extract?: Record<string, string | string[]>;
  blockResources?: string[];
  device?: string;
  scenario?: ScenarioStep[];
  cookies?: Cookie[];
  premiumProxy: boolean;
  mobileProxy: boolean;
  country?: string;
  sessionId?: string;
}

export interface ScreenshotOptions {
  fullPage: boolean;
  format: 'png' | 'jpeg';
  quality?: number;
}

export interface Cookie {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: number;
  httpOnly?: boolean;
  secure?: boolean;
  sameSite?: 'Strict' | 'Lax' | 'None';
}

export interface ScenarioStep {
  action: ScenarioAction;
  selector?: string;
  value?: string;
  timeout?: number;
  duration?: number;
  x?: number;
  y?: number;
  key?: string;
  script?: string;
  fullPage?: boolean;
}

export type ScenarioAction = 
  | 'wait_for'
  | 'wait'
  | 'wait_for_navigation'
  | 'click'
  | 'fill'
  | 'select'
  | 'scroll'
  | 'scroll_to'
  | 'screenshot'
  | 'evaluate'
  | 'hover'
  | 'press';

export interface CreditBreakdown {
  base: number;
  jsRender: number;
  premiumProxy: number;
  mobileProxy: number;
  captcha: number;
  screenshot: number;
  pdf: number;
}

// Job Result Interface
export interface JobResult {
  id: string;
  jobId: string;
  accountId: string; // Updated from organizationId for Phase 6
  statusCode?: number;
  statusText?: string;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  contentType?: string;
  contentLength?: number;
  contentEncoding?: string;
  finalUrl?: string;
  redirectCount: number;
  contentStorageType: 'inline' | 'minio' | 'none';
  contentInline?: string;
  contentMinioBucket?: string;
  contentMinioKey?: string;
  contentHash?: string;
  contentCompressed: boolean;
  extractedTitle?: string;
  extractedText?: string;
  extractedLinks?: string[];
  extractedImages?: string[];
  extractedData?: Record<string, unknown>;
  screenshotMinioBucket?: string;
  screenshotMinioKey?: string;
  screenshotThumbnailKey?: string;
  screenshotWidth?: number;
  screenshotHeight?: number;
  screenshotFormat?: string;
  pdfMinioBucket?: string;
  pdfMinioKey?: string;
  pdfPageCount?: number;
  dnsTimeMs?: number;
  connectTimeMs?: number;
  tlsTimeMs?: number;
  ttfbMs?: number;
  downloadTimeMs?: number;
  renderTimeMs?: number;
  totalTimeMs?: number;
  detectionScore?: number;
  protectionDetected?: string;
  captchaEncountered: boolean;
  captchaType?: string;
  captchaSolved: boolean;
  captchaSolveTimeMs?: number;
  proxyIp?: string;
  proxyCountry?: string;
  proxyProvider?: string;
  createdAt: Date;
  expiresAt?: Date;
}

// Scrape Request (API Input)
export interface ScrapeRequest {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  body?: string;
  options?: Partial<ScrapeOptions>;
  webhookUrl?: string;
  webhookSecret?: string;
  clientReference?: string;
  idempotencyKey?: string;
}

// Scrape Response (API Output)
export interface ScrapeResponse {
  success: boolean;
  jobId: string;
  url: string;
  resolvedUrl?: string;
  statusCode?: number;
  content?: string;
  contentType?: string;
  contentLength?: number;
  extracted?: Record<string, unknown>;
  screenshotUrl?: string;
  cookies?: Cookie[];
  headers?: Record<string, string>;
  timing: TimingInfo;
  credits: CreditsInfo;
  metadata: ResponseMetadata;
  error?: ErrorInfo;
}

export interface TimingInfo {
  queuedMs?: number;
  processingMs?: number;
  totalMs: number;
}

export interface CreditsInfo {
  used: number;
  breakdown: CreditBreakdown;
  remaining: number;
}

export interface ResponseMetadata {
  workerType: EngineType;
  proxyType: ProxyTier;
  proxyCountry?: string;
  attempts: number;
}

export interface ErrorInfo {
  code: string;
  message: string;
  details?: string;
  retryable: boolean;
  suggestions?: string[];
}

// Proxy Configuration
export interface ProxyConfig {
  id: string;
  url: string;
  protocol: 'http' | 'https' | 'socks5';
  host: string;
  port: number;
  username?: string;
  password?: string;
  country?: string;
  city?: string;
  provider: string;
  type: ProxyTier;
}

// Browser Fingerprint
export interface BrowserFingerprint {
  id: string;
  userAgent: string;
  navigator: NavigatorFingerprint;
  screen: ScreenFingerprint;
  webgl: WebGLFingerprint;
  headers: Record<string, string>;
  canvasNoiseSeed: string;
  audioNoiseSeed: string;
  timezone: string;
  locale: string;
}

export interface NavigatorFingerprint {
  platform: string;
  language: string;
  languages: string[];
  hardwareConcurrency: number;
  deviceMemory: number;
  maxTouchPoints: number;
  vendor: string;
  appVersion: string;
}

export interface ScreenFingerprint {
  width: number;
  height: number;
  availWidth: number;
  availHeight: number;
  colorDepth: number;
  pixelRatio: number;
}

export interface WebGLFingerprint {
  vendor: string;
  renderer: string;
  version: string;
}

// Engine Result (Internal)
export interface EngineResult {
  success: boolean;
  statusCode?: number;
  content?: string;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  finalUrl?: string;
  redirectCount?: number;
  timing?: {
    dnsMs?: number;
    connectMs?: number;
    tlsMs?: number;
    ttfbMs?: number;
    downloadMs?: number;
    renderMs?: number;
    totalMs: number;
  };
  screenshot?: Buffer;
  pdf?: Buffer;
  extracted?: Record<string, unknown>;
  error?: {
    code: string;
    message: string;
    retryable: boolean;
  };
}

// Queue Job Data
export interface QueueJobData {
  jobId: string;
  accountId: string; // Updated from organizationId for Phase 6
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: string;
  options: ScrapeOptions;
  engine: EngineType;
  proxyConfig?: ProxyConfig;
  fingerprint?: BrowserFingerprint;
  attempt: number;
  maxAttempts: number;
}

// Rate Limit Info
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
  window: number;
  concurrentLimit: number;
  concurrentActive: number;
}

// Pagination
export interface PaginationParams {
  page: number;
  limit: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// Billing and Payment Types (Phase 8)

export type SubscriptionStatus = 
  | 'active' 
  | 'past_due' 
  | 'canceled' 
  | 'incomplete' 
  | 'incomplete_expired' 
  | 'trialing' 
  | 'unpaid';

export interface Subscription {
  id: string;
  accountId: string;
  paystackSubscriptionCode?: string;
  paystackCustomerCode?: string;
  paystackPlanCode?: string;
  plan: PlanType;
  status: SubscriptionStatus;
  currentPeriodStart?: Date;
  currentPeriodEnd?: Date;
  cancelAtPeriodEnd: boolean;
  canceledAt?: Date;
  endedAt?: Date;
  trialStart?: Date;
  trialEnd?: Date;
  scheduledPlan?: PlanType;
  scheduledChangeDate?: Date;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentMethodType = 'card' | 'bank_account' | 'sepa_debit' | 'us_bank_account';

export interface PaymentMethod {
  id: string;
  accountId: string;
  paystackPaymentMethodId: string;
  type: PaymentMethodType;
  isDefault: boolean;
  cardBrand?: string;
  cardLast4?: string;
  cardExpMonth?: number;
  cardExpYear?: number;
  bankName?: string;
  bankLast4?: string;
  billingName?: string;
  billingEmail?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceStatus = 'draft' | 'open' | 'paid' | 'void' | 'uncollectible';

export interface Invoice {
  id: string;
  accountId: string;
  subscriptionId?: string;
  paystackInvoiceId?: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  subtotal: number;
  tax: number;
  total: number;
  amountPaid: number;
  amountDue: number;
  currency: string;
  invoiceDate: Date;
  dueDate?: Date;
  paidAt?: Date;
  voidedAt?: Date;
  periodStart?: Date;
  periodEnd?: Date;
  paymentMethodId?: string;
  paymentIntentId?: string;
  billingName?: string;
  billingEmail?: string;
  billingAddressLine1?: string;
  billingAddressLine2?: string;
  billingCity?: string;
  billingState?: string;
  billingPostalCode?: string;
  billingCountry?: string;
  pdfUrl?: string;
  pdfGeneratedAt?: Date;
  description?: string;
  notes?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type InvoiceLineItemType = 
  | 'subscription' 
  | 'credit_pack' 
  | 'proration' 
  | 'tax' 
  | 'discount' 
  | 'refund' 
  | 'other';

export interface InvoiceLineItem {
  id: string;
  invoiceId: string;
  type: InvoiceLineItemType;
  description: string;
  quantity: number;
  unitAmount: number;
  amount: number;
  currency: string;
  periodStart?: Date;
  periodEnd?: Date;
  creditPackPurchaseId?: string;
  subscriptionId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type CreditLedgerType = 
  | 'allocation' 
  | 'purchase' 
  | 'deduction' 
  | 'deduction_failure' 
  | 'reservation' 
  | 'release' 
  | 'adjustment' 
  | 'refund' 
  | 'reset' 
  | 'bonus';

export interface CreditLedgerEntry {
  id: string;
  accountId: string;
  type: CreditLedgerType;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  scrapeJobId?: string;
  creditPackPurchaseId?: string;
  invoiceId?: string;
  description: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
}

export type CreditPackPurchaseStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'refunded';

export interface CreditPackPurchase {
  id: string;
  accountId: string;
  invoiceId?: string;
  paystackPaymentReference?: string;
  packSize: number;
  amountPaid: number;
  currency: string;
  status: CreditPackPurchaseStatus;
  purchasedAt?: Date;
  completedAt?: Date;
  refundedAt?: Date;
  paymentMethodId?: string;
  description?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type PaymentFailureEscalationStage = 'grace' | 'retry' | 'restricted' | 'suspended' | 'canceled';

export type PaymentFailureResolvedBy = 
  | 'payment_succeeded' 
  | 'payment_method_updated' 
  | 'manual_resolution' 
  | 'subscription_canceled';

export interface PaymentFailure {
  id: string;
  accountId: string;
  invoiceId?: string;
  subscriptionId?: string;
  failureCode?: string;
  failureMessage?: string;
  escalationStage: PaymentFailureEscalationStage;
  firstFailedAt: Date;
  lastRetryAt?: Date;
  nextRetryAt?: Date;
  gracePeriodEnd?: Date;
  restrictedAt?: Date;
  suspendedAt?: Date;
  resolvedAt?: Date;
  retryCount: number;
  maxRetries: number;
  isResolved: boolean;
  resolvedBy?: PaymentFailureResolvedBy;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export type RefundStatus = 'pending' | 'succeeded' | 'failed' | 'canceled';

export type RefundReason = 'duplicate' | 'fraudulent' | 'requested_by_customer' | 'other';

export interface Refund {
  id: string;
  accountId: string;
  invoiceId?: string;
  creditPackPurchaseId?: string;
  paystackRefundId?: string;
  amount: number;
  currency: string;
  status: RefundStatus;
  reason: RefundReason;
  description?: string;
  requestedAt: Date;
  processedAt?: Date;
  requestedByUserId?: string;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Phase 9: Settings, Support, and Team Foundations

// Notification Types (Phase 9)
export type NotificationType =
  | 'support_reply'
  | 'support_resolved'
  | 'billing_payment_success'
  | 'billing_payment_failed'
  | 'billing_credit_low'
  | 'billing_plan_changed'
  | 'security_password_changed'
  | 'security_email_changed'
  | 'security_mfa_enabled'
  | 'security_mfa_disabled'
  | 'system_maintenance'
  | 'system_feature'
  | 'api_key_created'
  | 'api_key_revoked'
  | 'job_failed_high_rate';

export type NotificationPriority = 'low' | 'normal' | 'high' | 'urgent';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  priority: NotificationPriority;
  title: string;
  message: string;
  actionUrl?: string;
  actionText?: string;
  metadata: Record<string, unknown>;
  readAt?: Date;
  createdAt: Date;
}

// Notification Preferences (Phase 9)
export interface NotificationPreference {
  id: string;
  userId: string;
  category: string;
  emailEnabled: boolean;
  inAppEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Support Ticket Types (Phase 9)
export type TicketStatus = 'open' | 'waiting_user' | 'waiting_staff' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 'billing' | 'technical' | 'feature_request' | 'bug_report' | 'account' | 'other';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  accountId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedToUserId?: string;
  resolvedAt?: Date;
  resolvedByUserId?: string;
  closedAt?: Date;
  lastReplyAt?: Date;
  lastReplyByUser?: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  userId: string;
  isStaff: boolean;
  message: string;
  attachments: TicketAttachment[];
  isInternal: boolean;
  metadata: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketAttachment {
  filename: string;
  url: string;
  size: number;
  type: string;
}

// Email Change Token (Phase 9)
export interface EmailChangeToken {
  id: string;
  userId: string;
  oldEmail: string;
  newEmail: string;
  token: string;
  newEmailVerified: boolean;
  oldEmailNotified: boolean;
  expiresAt: Date;
  usedAt?: Date;
  createdAt: Date;
}

// User Session (Phase 9)
export interface UserSession {
  id: string;
  userId: string;
  sessionTokenHash: string;
  deviceType?: 'desktop' | 'mobile' | 'tablet';
  deviceName?: string;
  browser?: string;
  os?: string;
  ipAddress?: string;
  locationCountry?: string;
  locationCity?: string;
  isCurrent: boolean;
  lastActivityAt: Date;
  createdAt: Date;
  expiresAt: Date;
  revokedAt?: Date;
}

// User Profile Update Request (Phase 9)
export interface UserProfileUpdateRequest {
  name?: string;
  timezone?: string;
  dateFormat?: string;
}

// Email Change Request (Phase 9)
export interface EmailChangeRequest {
  newEmail: string;
  password: string;
}

// Password Change Request (Phase 9)
export interface PasswordChangeRequest {
  currentPassword: string;
  newPassword: string;
}

// Account Deletion Request (Phase 9)
export interface AccountDeletionRequest {
  password: string;
  confirmText: string;
}

// Appearance Settings (Phase 9)
export interface AppearanceSettings {
  theme: 'light' | 'dark' | 'system';
  displayDensity: 'comfortable' | 'compact';
}

// Support Ticket Create Request (Phase 9)
export interface CreateTicketRequest {
  subject: string;
  message: string;
  category: TicketCategory;
  priority?: TicketPriority;
}

// Support Ticket Reply Request (Phase 9)
export interface TicketReplyRequest {
  message: string;
  attachments?: TicketAttachment[];
}

// Knowledge Base Article (Phase 9)
export interface KnowledgeBaseArticle {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  relevanceScore?: number;
}

// ==================== Phase 10: Admin Dashboard Types ====================

// Audit Log Types
export type AuditLogCategory = 
  | 'user_management' 
  | 'support' 
  | 'financial' 
  | 'operations' 
  | 'content' 
  | 'security';

export interface AuditLog {
  id: string;
  adminId: string;
  adminEmail: string;
  action: string;
  category: AuditLogCategory;
  resourceType: string;
  resourceId?: string;
  details: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

// Support Ticket Admin Types
export type TicketStatus = 'open' | 'in_progress' | 'waiting_on_user' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'normal' | 'high' | 'urgent';
export type TicketCategory = 
  | 'technical' 
  | 'billing' 
  | 'account' 
  | 'feature_request' 
  | 'bug_report' 
  | 'abuse_report' 
  | 'other';

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  userId: string;
  accountId: string;
  subject: string;
  category: TicketCategory;
  priority: TicketPriority;
  status: TicketStatus;
  assignedTo?: string;
  assignedAt?: Date;
  firstResponseAt?: Date;
  resolvedAt?: Date;
  closedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export type MessageType = 'user_message' | 'admin_reply' | 'internal_note' | 'system_message';

export interface SupportTicketMessage {
  id: string;
  ticketId: string;
  authorId: string;
  authorType: 'user' | 'admin' | 'system';
  messageType: MessageType;
  content: string;
  isInternal: boolean;
  attachments: TicketAttachment[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketAttachment {
  filename: string;
  url: string;
  size: number;
  type: string;
}

// Abuse Detection Types
export type AbuseSignalType = 
  | 'high_credit_consumption' 
  | 'rapid_api_key_creation' 
  | 'failed_request_pattern' 
  | 'unusual_traffic_pattern' 
  | 'multiple_account_creation';

export type AbuseSeverity = 'low' | 'medium' | 'high' | 'critical';
export type AbuseFlagStatus = 'active' | 'investigating' | 'resolved' | 'false_positive';

export interface AbuseFlag {
  id: string;
  userId?: string;
  accountId?: string;
  signalType: AbuseSignalType;
  severity: AbuseSeverity;
  status: AbuseFlagStatus;
  detectedAt: Date;
  thresholdValue?: number;
  actualValue?: number;
  evidence: Record<string, unknown>;
  investigatedBy?: string;
  investigatedAt?: Date;
  resolutionNote?: string;
  resolvedAt?: Date;
  actionTaken?: string;
  actionDetails?: Record<string, unknown>;
  createdAt: Date;
  updatedAt: Date;
}

// Refund Management Types
export type RefundStatus = 'pending' | 'approved' | 'denied' | 'processing' | 'completed' | 'failed';
export type RefundType = 'full' | 'partial' | 'credit_adjustment';

export interface RefundRequest {
  id: string;
  userId: string;
  accountId: string;
  invoiceId?: string;
  refundType: RefundType;
  status: RefundStatus;
  originalAmount: number;
  refundAmount: number;
  reason: string;
  userNotes?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  adminNotes?: string;
  approvedAt?: Date;
  processedAt?: Date;
  completedAt?: Date;
  paymentProcessor?: string;
  processorRefundId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Blog Management Types
export type BlogPostStatus = 'draft' | 'published' | 'archived';

export interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt?: string;
  content: string;
  featuredImageUrl?: string;
  featuredImageAlt?: string;
  tags: string[];
  metaTitle?: string;
  metaDescription?: string;
  ogImageUrl?: string;
  status: BlogPostStatus;
  authorId: string;
  publishedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Status Page Types
export type ServiceStatus = 
  | 'operational' 
  | 'degraded_performance' 
  | 'partial_outage' 
  | 'major_outage' 
  | 'under_maintenance';

export type IncidentStatus = 'investigating' | 'identified' | 'monitoring' | 'resolved';
export type IncidentSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface ServiceStatusConfig {
  id: string;
  serviceName: string;
  serviceDisplayName: string;
  description?: string;
  status: ServiceStatus;
  displayOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusIncident {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: IncidentSeverity;
  affectedServices: string[];
  startedAt: Date;
  resolvedAt?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface StatusIncidentUpdate {
  id: string;
  incidentId: string;
  message: string;
  status: IncidentStatus;
  createdBy: string;
  createdAt: Date;
}

// System Configuration Types
export type ConfigValueType = 'string' | 'number' | 'boolean' | 'json';
export type ConfigCategory = 
  | 'general' 
  | 'api' 
  | 'billing' 
  | 'email' 
  | 'security' 
  | 'features' 
  | 'limits' 
  | 'maintenance';

export interface SystemConfiguration {
  id: string;
  configKey: string;
  valueType: ConfigValueType;
  value: string;
  category: ConfigCategory;
  description?: string;
  isSecret: boolean;
  isCritical: boolean;
  validationRegex?: string;
  minValue?: number;
  maxValue?: number;
  allowedValues?: string[];
  lastModifiedBy?: string;
  lastModifiedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

// Admin API Request/Response Types

export interface AdminUserListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: AccountStatus;
  role?: UserRoleType;
  plan?: PlanType;
  sortBy?: 'created_at' | 'updated_at' | 'last_login_at';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminUserDetail extends User {
  account: Account;
  jobsCount: number;
  ticketsCount: number;
  totalSpent: number;
}

export interface AdminTicketListQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  category?: TicketCategory;
  assignedTo?: string;
  sortBy?: 'created_at' | 'updated_at' | 'priority';
  sortOrder?: 'asc' | 'desc';
}

export interface AdminTicketDetail extends SupportTicket {
  user: User;
  account: Account;
  messages: SupportTicketMessage[];
  relatedTickets: SupportTicket[];
}

export interface AdminOverviewStats {
  totalUsers: number;
  activeUsers: number;
  totalJobs: number;
  jobsToday: number;
  mrr: number;
  revenue30d: number;
  ticketsOpen: number;
  ticketsPending: number;
  systemHealth: 'healthy' | 'degraded' | 'down';
}

export interface AdminSearchQuery {
  query: string;
  types?: ('user' | 'ticket' | 'job' | 'invoice')[];
  limit?: number;
}

export interface AdminSearchResult {
  users: Array<{ id: string; email: string; name: string }>;
  tickets: Array<{ id: string; ticketNumber: string; subject: string }>;
  jobs: Array<{ id: string; url: string; status: JobStatus }>;
  invoices: Array<{ id: string; amount: number; status: string }>;
}
