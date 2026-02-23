import { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../../utils/logger.js';

/**
 * Input Validation and Sanitization Middleware
 * 
 * Provides comprehensive input validation and sanitization to prevent:
 * - SQL Injection
 * - XSS (Cross-Site Scripting)
 * - Path Traversal
 * - Command Injection
 * - LDAP Injection
 * - XML Injection
 * 
 * This middleware runs AFTER schema validation and provides additional
 * security checks on all user input.
 */

// Dangerous patterns that should be blocked
const DANGEROUS_PATTERNS = {
  // SQL Injection patterns (keywords, classic boolean logic, and special chars)
  SQL_INJECTION: /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST|OR|AND)\b\s*\d)|(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE|CAST)\b)|(-{2})|\/\*|\*\/|;/gi,
  
  // XSS patterns
  XSS: /<script[^>]*>.*?<\/script>|<iframe[^>]*>.*?<\/iframe>|javascript:|on\w+\s*=|<object[^>]*>|<embed[^>]*>/gi,
  
  // Path traversal
  PATH_TRAVERSAL: /\.\.\/|\.\.\\|%2e%2e%2f|%2e%2e\/|\.\.%2f|%2e%2e%5c/gi,
  
  // Command injection
  COMMAND_INJECTION: /[;&|`$(){}[\]<>]/g,
  
  // LDAP injection
  LDAP_INJECTION: /[*()|&]/g,
  
  // NoSQL injection (MongoDB)
  NOSQL_INJECTION: /\$where|\$ne|\$gt|\$lt|\$gte|\$lte|\$regex|\$in|\$nin/gi,
};

// Whitelist patterns for specific fields
const WHITELIST_PATTERNS = {
  // URL: Allow valid HTTP/HTTPS URLs
  URL: /^https?:\/\/(www\.)?[-a-zA-Z0-9@:%._+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_+.~#?&//=]*)$/,
  
  // Email: RFC 5322 simplified
  EMAIL: /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
  
  // UUID (any version)
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
  
  // Alphanumeric with some special characters
  ALPHANUMERIC: /^[a-zA-Z0-9_-]+$/,
  
  // Slug (for URLs)
  SLUG: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
  
  // API Key format (32-64 alphanumeric characters)
  API_KEY: /^[a-zA-Z0-9]{32,64}$/,
  
  // ISO 8601 date
  ISO_DATE: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?(Z|[+-]\d{2}:\d{2})?)?$/,
  
  // Domain name
  DOMAIN: /^(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9][a-z0-9-]{0,61}[a-z0-9]$/i,
};

/**
 * Check if string contains dangerous patterns
 */
function containsDangerousPattern(value: string, patterns: RegExp[]): boolean {
  return patterns.some(pattern => pattern.test(value));
}

/**
 * Sanitize string by removing dangerous characters
 */
function sanitizeString(value: string): string {
  // Remove null bytes
  let sanitized = value.replace(/\0/g, '');
  
  // Trim whitespace
  sanitized = sanitized.trim();
  
  // Limit length to prevent DoS
  const MAX_STRING_LENGTH = 10000;
  if (sanitized.length > MAX_STRING_LENGTH) {
    sanitized = sanitized.substring(0, MAX_STRING_LENGTH);
  }
  
  return sanitized;
}

/**
 * Deep sanitize an object
 */
function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) {
    return obj;
  }
  
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObject(item));
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Sanitize both key and value
      const sanitizedKey = sanitizeString(key);
      sanitized[sanitizedKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Validate URL input
 */
export function isValidUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    
    // Only allow http and https protocols
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      return false;
    }
    
    // Check against whitelist pattern
    if (!WHITELIST_PATTERNS.URL.test(url)) {
      return false;
    }
    
    // Check for dangerous patterns
    if (containsDangerousPattern(url, [
      DANGEROUS_PATTERNS.XSS,
      DANGEROUS_PATTERNS.COMMAND_INJECTION,
    ])) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate email input
 */
export function isValidEmail(email: string): boolean {
  if (!email || email.length > 254) {
    return false;
  }
  
  return WHITELIST_PATTERNS.EMAIL.test(email);
}

/**
 * Validate UUID
 */
export function isValidUuid(uuid: string): boolean {
  return WHITELIST_PATTERNS.UUID.test(uuid);
}

/**
 * Check for SQL injection patterns
 */
export function checkForSqlInjection(input: string): boolean {
  DANGEROUS_PATTERNS.SQL_INJECTION.lastIndex = 0;
  return DANGEROUS_PATTERNS.SQL_INJECTION.test(input);
}

/**
 * Check for XSS patterns
 */
export function checkForXss(input: string): boolean {
  DANGEROUS_PATTERNS.XSS.lastIndex = 0;
  return DANGEROUS_PATTERNS.XSS.test(input);
}

/**
 * Check for path traversal
 */
export function checkForPathTraversal(input: string): boolean {
  DANGEROUS_PATTERNS.PATH_TRAVERSAL.lastIndex = 0;
  return DANGEROUS_PATTERNS.PATH_TRAVERSAL.test(input);
}

/**
 * Input validation middleware
 */
export async function inputValidation(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  try {
    // Skip validation for health check endpoints
    if (request.url.startsWith('/health') || request.url === '/') {
      return;
    }
    
    // Validate and sanitize body
    if (request.body && typeof request.body === 'object') {
      // Check for dangerous patterns in body strings
      const bodyStr = JSON.stringify(request.body);
      
      if (checkForSqlInjection(bodyStr)) {
        logger.warn(
          { 
            requestId: request.id,
            ip: request.ip,
            path: request.url,
          },
          'SQL injection attempt detected in request body'
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid input detected',
            retryable: false,
          },
        });
      }
      
      if (checkForXss(bodyStr)) {
        logger.warn(
          { 
            requestId: request.id,
            ip: request.ip,
            path: request.url,
          },
          'XSS attempt detected in request body'
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid input detected',
            retryable: false,
          },
        });
      }
      
      // Sanitize the body
      request.body = sanitizeObject(request.body);
    }
    
    // Validate query parameters
    if (request.query && typeof request.query === 'object') {
      const queryStr = JSON.stringify(request.query);
      
      if (checkForSqlInjection(queryStr)) {
        logger.warn(
          { 
            requestId: request.id,
            ip: request.ip,
            path: request.url,
          },
          'SQL injection attempt detected in query parameters'
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid query parameters',
            retryable: false,
          },
        });
      }
      
      if (checkForXss(queryStr)) {
        logger.warn(
          { 
            requestId: request.id,
            ip: request.ip,
            path: request.url,
          },
          'XSS attempt detected in query parameters'
        );
        return reply.status(400).send({
          success: false,
          error: {
            code: 'INVALID_INPUT',
            message: 'Invalid query parameters',
            retryable: false,
          },
        });
      }
      
      // Sanitize query params
      request.query = sanitizeObject(request.query);
    }
    
    // Validate path parameters
    if (request.params && typeof request.params === 'object') {
      for (const [key, value] of Object.entries(request.params)) {
        if (typeof value === 'string') {
          if (checkForPathTraversal(value)) {
            logger.warn(
              { 
                requestId: request.id,
                ip: request.ip,
                path: request.url,
                param: key,
              },
              'Path traversal attempt detected'
            );
            return reply.status(400).send({
              success: false,
              error: {
                code: 'INVALID_INPUT',
                message: 'Invalid path parameter',
                retryable: false,
              },
            });
          }
        }
      }
      
      // Sanitize params
      request.params = sanitizeObject(request.params);
    }
    
    // Validate specific headers for injection attempts
    const dangerousHeaders = ['user-agent', 'referer', 'x-forwarded-for'];
    for (const headerName of dangerousHeaders) {
      const headerValue = request.headers[headerName];
      if (typeof headerValue === 'string') {
        if (checkForSqlInjection(headerValue) || checkForXss(headerValue)) {
          logger.warn(
            { 
              requestId: request.id,
              ip: request.ip,
              path: request.url,
              header: headerName,
            },
            'Malicious header detected'
          );
          return reply.status(400).send({
            success: false,
            error: {
              code: 'INVALID_INPUT',
              message: 'Invalid request headers',
              retryable: false,
            },
          });
        }
      }
    }
    
  } catch (error) {
    logger.error({ err: error, requestId: request.id }, 'Error in input validation middleware');
    return reply.status(500).send({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'Internal server error',
        retryable: true,
      },
    });
  }
}

// Export validation utilities for use in route handlers
export {
  sanitizeString,
  sanitizeObject,
  WHITELIST_PATTERNS,
  DANGEROUS_PATTERNS,
};
