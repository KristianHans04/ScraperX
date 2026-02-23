import { FastifyRequest, FastifyReply } from 'fastify';
import { randomBytes, createHmac, timingSafeEqual } from 'crypto';
import { logger } from '../../utils/logger.js';

/**
 * CSRF Protection Middleware
 * 
 * Implements Double Submit Cookie pattern for CSRF protection.
 * Protects against Cross-Site Request Forgery attacks by requiring
 * a valid CSRF token in requests that modify data (POST, PUT, PATCH, DELETE).
 * 
 * How it works:
 * 1. Server generates a random CSRF token and sends it in a cookie
 * 2. Client includes token in X-CSRF-Token header for state-changing requests
 * 3. Server validates that cookie token matches header token
 */

const CSRF_COOKIE_NAME = 'csrf-token';
const CSRF_HEADER_NAME = 'x-csrf-token';
const CSRF_TOKEN_LENGTH = 32;
const CSRF_SECRET = process.env.CSRF_SECRET || 'change-this-in-production';

// HTTP methods that require CSRF protection
const PROTECTED_METHODS = ['POST', 'PUT', 'PATCH', 'DELETE'];

// Routes that should skip CSRF protection (e.g., public API endpoints)
const CSRF_EXEMPT_ROUTES = [
  '/health',
  '/metrics',
  '/v1/scrape', // API endpoints use API keys, not sessions
  '/v1/jobs',
  '/v1/batch',
];

/**
 * Generate a cryptographically secure CSRF token
 */
export function generateCsrfToken(): string {
  return randomBytes(CSRF_TOKEN_LENGTH).toString('hex');
}

/**
 * Generate HMAC signature for CSRF token
 */
function signToken(token: string): string {
  return createHmac('sha256', CSRF_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Verify CSRF token signature
 */
function verifyToken(token: string, signature: string): boolean {
  const expectedSignature = signToken(token);
  
  // Use timing-safe comparison to prevent timing attacks
  try {
    return timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );
  } catch {
    return false;
  }
}

/**
 * Check if route should skip CSRF protection
 */
function shouldSkipCsrf(path: string): boolean {
  return CSRF_EXEMPT_ROUTES.some(exemptPath => path.startsWith(exemptPath));
}

/**
 * Set CSRF token cookie
 */
export function setCsrfCookie(reply: FastifyReply): string {
  const token = generateCsrfToken();
  const signature = signToken(token);
  
  // Set token in cookie (accessible to JavaScript)
  reply.setCookie(CSRF_COOKIE_NAME, token, {
    httpOnly: false, // Must be accessible to JavaScript
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });
  
  // Set signature in httpOnly cookie (not accessible to JavaScript)
  reply.setCookie(`${CSRF_COOKIE_NAME}-sig`, signature, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: 86400, // 24 hours
  });
  
  return token;
}

/**
 * CSRF protection middleware
 */
export async function csrfProtection(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Skip CSRF for safe methods (GET, HEAD, OPTIONS)
  if (!PROTECTED_METHODS.includes(request.method)) {
    return;
  }
  
  // Skip CSRF for exempt routes (public API endpoints)
  if (shouldSkipCsrf(request.url)) {
    return;
  }
  
  // Get CSRF token from cookie
  const cookieToken = request.cookies[CSRF_COOKIE_NAME];
  const cookieSignature = request.cookies[`${CSRF_COOKIE_NAME}-sig`];
  
  // Get CSRF token from header
  const headerToken = request.headers[CSRF_HEADER_NAME] as string | undefined;
  
  // Validate that both token and signature exist
  if (!cookieToken || !cookieSignature) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
        path: request.url,
        method: request.method,
      },
      'CSRF token missing from cookies'
    );
    
    return reply.status(403).send({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token not found. Please refresh the page and try again.',
        retryable: false,
      },
    });
  }
  
  // Validate that header token exists
  if (!headerToken) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
        path: request.url,
        method: request.method,
      },
      'CSRF token missing from request header'
    );
    
    return reply.status(403).send({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISSING',
        message: 'CSRF token not provided in request header.',
        retryable: false,
      },
    });
  }
  
  // Verify token signature
  if (!verifyToken(cookieToken, cookieSignature)) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
        path: request.url,
        method: request.method,
      },
      'CSRF token signature verification failed'
    );
    
    return reply.status(403).send({
      success: false,
      error: {
        code: 'CSRF_TOKEN_INVALID',
        message: 'Invalid CSRF token. Please refresh the page and try again.',
        retryable: false,
      },
    });
  }
  
  // Verify that cookie token matches header token
  if (cookieToken !== headerToken) {
    logger.warn(
      {
        requestId: request.id,
        ip: request.ip,
        path: request.url,
        method: request.method,
      },
      'CSRF token mismatch between cookie and header'
    );
    
    return reply.status(403).send({
      success: false,
      error: {
        code: 'CSRF_TOKEN_MISMATCH',
        message: 'CSRF token verification failed. Please refresh the page and try again.',
        retryable: false,
      },
    });
  }
  
  // CSRF token is valid, allow request to proceed
  logger.debug(
    {
      requestId: request.id,
      path: request.url,
      method: request.method,
    },
    'CSRF token validated successfully'
  );
}

/**
 * Middleware to automatically set CSRF token for GET requests
 */
export async function setCsrfTokenMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  // Only set token for GET requests to protected routes
  if (request.method === 'GET' && !shouldSkipCsrf(request.url)) {
    const existingToken = request.cookies[CSRF_COOKIE_NAME];
    
    // Only generate new token if one doesn't exist
    if (!existingToken) {
      const token = setCsrfCookie(reply);
      logger.debug(
        {
          requestId: request.id,
          path: request.url,
        },
        'CSRF token generated and set in cookie'
      );
    }
  }
}
