// Core Types for ScraperX

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
  organizationId: string;
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
  organizationId: string;
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
  organizationId: string;
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
  organizationId: string;
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
