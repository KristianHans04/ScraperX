/**
 * Custom error classes for Scrapifie
 */

export class ScrapifieError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly retryable: boolean;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    code: string,
    statusCode: number = 500,
    retryable: boolean = false,
    details?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'ScrapifieError';
    this.code = code;
    this.statusCode = statusCode;
    this.retryable = retryable;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Authentication Errors
export class InvalidApiKeyError extends ScrapifieError {
  constructor(message: string = 'Invalid API key') {
    super(message, 'INVALID_API_KEY', 401, false);
  }
}

export class ExpiredApiKeyError extends ScrapifieError {
  constructor(message: string = 'API key has expired') {
    super(message, 'EXPIRED_API_KEY', 401, false);
  }
}

export class RevokedApiKeyError extends ScrapifieError {
  constructor(message: string = 'API key has been revoked') {
    super(message, 'REVOKED_API_KEY', 401, false);
  }
}

export class MissingApiKeyError extends ScrapifieError {
  constructor(message: string = 'API key is required') {
    super(message, 'MISSING_API_KEY', 401, false);
  }
}

export class IpNotAllowedError extends ScrapifieError {
  constructor(message: string = 'Request from non-whitelisted IP') {
    super(message, 'IP_NOT_ALLOWED', 403, false);
  }
}

export class AccountSuspendedError extends ScrapifieError {
  constructor(message: string = 'Account has been suspended') {
    super(message, 'ACCOUNT_SUSPENDED', 403, false);
  }
}

// Validation Errors
export class InvalidUrlError extends ScrapifieError {
  constructor(message: string = 'Invalid URL format') {
    super(message, 'INVALID_URL', 400, false);
  }
}

export class InvalidOptionsError extends ScrapifieError {
  constructor(message: string = 'Invalid request options') {
    super(message, 'INVALID_OPTIONS', 400, false);
  }
}

export class UrlNotAllowedError extends ScrapifieError {
  constructor(message: string = 'URL is not allowed') {
    super(message, 'URL_NOT_ALLOWED', 400, false);
  }
}

export class BatchTooLargeError extends ScrapifieError {
  constructor(maxSize: number) {
    super(`Batch size exceeds maximum of ${maxSize}`, 'BATCH_TOO_LARGE', 400, false);
  }
}

// Resource Errors
export class InsufficientCreditsError extends ScrapifieError {
  constructor(required: number, available: number) {
    super(
      `Insufficient credits. Required: ${required}, Available: ${available}`,
      'INSUFFICIENT_CREDITS',
      402,
      false,
      { required, available }
    );
  }
}

export class RateLimitedError extends ScrapifieError {
  public readonly retryAfter: number;

  constructor(retryAfter: number, message?: string) {
    super(
      message || `Rate limit exceeded. Retry after ${retryAfter} seconds`,
      'RATE_LIMITED',
      429,
      true,
      { retryAfter }
    );
    this.retryAfter = retryAfter;
  }
}

export class ConcurrentLimitError extends ScrapifieError {
  constructor(limit: number) {
    super(
      `Maximum concurrent requests (${limit}) reached`,
      'CONCURRENT_LIMIT',
      429,
      true,
      { limit }
    );
  }
}

export class JobNotFoundError extends ScrapifieError {
  constructor(jobId: string) {
    super(`Job not found: ${jobId}`, 'JOB_NOT_FOUND', 404, false);
  }
}

export class BatchNotFoundError extends ScrapifieError {
  constructor(batchId: string) {
    super(`Batch not found: ${batchId}`, 'BATCH_NOT_FOUND', 404, false);
  }
}

// Scraping Errors
export class BlockedError extends ScrapifieError {
  public readonly suggestions: string[];

  constructor(message: string = 'Request was blocked by target site', suggestions: string[] = []) {
    super(message, 'BLOCKED', 403, true, { suggestions });
    this.suggestions = suggestions.length > 0 ? suggestions : [
      'Enable JavaScript rendering with render_js: true',
      'Use premium proxy with premium_proxy: true',
      'Try mobile proxy for heavily protected sites with mobile_proxy: true',
    ];
  }
}

export class CaptchaRequiredError extends ScrapifieError {
  constructor(captchaType?: string) {
    super(
      'CAPTCHA challenge encountered',
      'CAPTCHA_REQUIRED',
      403,
      true,
      { captchaType }
    );
  }
}

export class CaptchaFailedError extends ScrapifieError {
  constructor(message: string = 'Failed to solve CAPTCHA') {
    super(message, 'CAPTCHA_FAILED', 403, true);
  }
}

export class TimeoutError extends ScrapifieError {
  constructor(timeoutMs: number) {
    super(
      `Request timed out after ${timeoutMs}ms`,
      'TIMEOUT',
      408,
      true,
      { timeoutMs }
    );
  }
}

export class TargetError extends ScrapifieError {
  constructor(statusCode: number, message: string = 'Target site returned an error') {
    super(message, 'TARGET_ERROR', 502, true, { targetStatusCode: statusCode });
  }
}

export class TargetUnavailableError extends ScrapifieError {
  constructor(message: string = 'Could not connect to target site') {
    super(message, 'TARGET_UNAVAILABLE', 502, true);
  }
}

// System Errors
export class InternalError extends ScrapifieError {
  constructor(message: string = 'Internal server error') {
    super(message, 'INTERNAL_ERROR', 500, true);
  }
}

export class WorkerUnavailableError extends ScrapifieError {
  constructor(message: string = 'No workers available') {
    super(message, 'WORKER_UNAVAILABLE', 503, true);
  }
}

export class ServiceMaintenanceError extends ScrapifieError {
  constructor(message: string = 'Service is under maintenance') {
    super(message, 'SERVICE_MAINTENANCE', 503, false);
  }
}

// Proxy Errors
export class ProxyError extends ScrapifieError {
  constructor(message: string = 'Proxy error occurred') {
    super(message, 'PROXY_ERROR', 502, true);
  }
}

export class ProxyAuthenticationError extends ScrapifieError {
  constructor(message: string = 'Proxy authentication failed') {
    super(message, 'PROXY_AUTH_ERROR', 502, true);
  }
}

// Database Errors
export class DatabaseError extends ScrapifieError {
  constructor(message: string = 'Database error occurred') {
    super(message, 'DATABASE_ERROR', 500, true);
  }
}

export class DatabaseConnectionError extends ScrapifieError {
  constructor(message: string = 'Could not connect to database') {
    super(message, 'DATABASE_CONNECTION_ERROR', 500, true);
  }
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: Error): boolean {
  if (error instanceof ScrapifieError) {
    return error.retryable;
  }
  return false;
}

/**
 * Convert unknown error to ScrapifieError
 */
export function toScrapifieError(error: unknown): ScrapifieError {
  if (error instanceof ScrapifieError) {
    return error;
  }

  if (error instanceof Error) {
    return new InternalError(error.message);
  }

  return new InternalError('An unknown error occurred');
}
