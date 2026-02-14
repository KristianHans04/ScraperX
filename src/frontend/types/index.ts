export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'user';
  emailVerified: boolean;
  mfaEnabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Account {
  id: string;
  plan: 'free' | 'pro' | 'enterprise';
  creditBalance: number;
  status: 'active' | 'suspended' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: string;
  name: string;
  keyPreview: string;
  type: 'standard' | 'restricted';
  status: 'active' | 'revoked';
  lastUsedAt: string | null;
  createdAt: string;
  expiresAt: string | null;
}

export interface Job {
  id: string;
  url: string;
  engine: 'http' | 'browser' | 'stealth';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  creditsUsed: number;
  duration: number | null;
  createdAt: string;
  completedAt: string | null;
}

export interface JobDetail extends Job {
  options: Record<string, unknown>;
  error: string | null;
  retryCount: number;
  result: {
    content: string;
    contentType: string;
    size: number;
    metadata: Record<string, unknown>;
  } | null;
}

export interface JobLog {
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
}

export interface DashboardStats {
  totalJobs: number;
  successRate: number;
  creditsUsed: number;
  creditsRemaining: number;
}

export interface CreditUsage {
  date: string;
  credits: number;
}

export interface UsageStats {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalCreditsUsed: number;
  avgResponseTime: number;
}

export interface EngineUsage {
  engine: string;
  requests: number;
  percentage: number;
}

export interface DomainUsage {
  domain: string;
  requests: number;
  credits: number;
}

export interface ApiKeyUsage {
  keyId: string;
  keyName: string;
  requests: number;
  credits: number;
}

export interface TimeRange {
  start: string;
  end: string;
  preset?: '7d' | '30d' | '90d';
}

export interface PaginationParams {
  page: number;
  limit: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}
