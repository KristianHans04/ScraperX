import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Security Headers Middleware
 * 
 * Implements comprehensive security headers as required by Phase 12:
 * - Content-Security-Policy (CSP)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - Strict-Transport-Security (HSTS)
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 * 
 * All headers are configured according to OWASP best practices.
 */

export interface SecurityHeadersOptions {
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableFrameGuard?: boolean;
  enableXSSFilter?: boolean;
  enableNoSniff?: boolean;
  enableReferrerPolicy?: boolean;
  enablePermissionsPolicy?: boolean;
  cspDirectives?: Record<string, string[]>;
  hstsMaxAge?: number;
  hstsIncludeSubdomains?: boolean;
  hstsPreload?: boolean;
}

const DEFAULT_OPTIONS: SecurityHeadersOptions = {
  enableCSP: true,
  enableHSTS: true,
  enableFrameGuard: true,
  enableXSSFilter: true,
  enableNoSniff: true,
  enableReferrerPolicy: true,
  enablePermissionsPolicy: true,
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: true,
  cspDirectives: {
    'default-src': ["'self'"],
    'script-src': ["'self'", "'unsafe-inline'", "'unsafe-eval'"], // TODO: Remove unsafe-inline/eval in production
    'style-src': ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
    'font-src': ["'self'", 'https://fonts.gstatic.com'],
    'img-src': ["'self'", 'data:', 'https:', 'blob:'],
    'connect-src': ["'self'", 'https://api.stripe.com'],
    'frame-ancestors': ["'none'"],
    'base-uri': ["'self'"],
    'form-action': ["'self'"],
    'object-src': ["'none'"],
    'upgrade-insecure-requests': [],
  },
};

/**
 * Build CSP header value from directives
 */
function buildCSPHeader(directives: Record<string, string[]>): string {
  return Object.entries(directives)
    .map(([directive, sources]) => {
      if (sources.length === 0) {
        return directive;
      }
      return `${directive} ${sources.join(' ')}`;
    })
    .join('; ');
}

/**
 * Security headers middleware factory
 */
export function createSecurityHeadersMiddleware(options: SecurityHeadersOptions = {}) {
  const config = { ...DEFAULT_OPTIONS, ...options };

  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    // Content-Security-Policy (CSP)
    if (config.enableCSP && config.cspDirectives) {
      const cspHeader = buildCSPHeader(config.cspDirectives);
      reply.header('Content-Security-Policy', cspHeader);
    }

    // Strict-Transport-Security (HSTS)
    if (config.enableHSTS) {
      const hstsDirectives = [`max-age=${config.hstsMaxAge}`];
      if (config.hstsIncludeSubdomains) {
        hstsDirectives.push('includeSubDomains');
      }
      if (config.hstsPreload) {
        hstsDirectives.push('preload');
      }
      reply.header('Strict-Transport-Security', hstsDirectives.join('; '));
    }

    // X-Frame-Options (Clickjacking protection)
    if (config.enableFrameGuard) {
      reply.header('X-Frame-Options', 'DENY');
    }

    // X-Content-Type-Options (MIME sniffing protection)
    if (config.enableNoSniff) {
      reply.header('X-Content-Type-Options', 'nosniff');
    }

    // X-XSS-Protection (Legacy XSS filter)
    if (config.enableXSSFilter) {
      reply.header('X-XSS-Protection', '1; mode=block');
    }

    // Referrer-Policy
    if (config.enableReferrerPolicy) {
      reply.header('Referrer-Policy', 'strict-origin-when-cross-origin');
    }

    // Permissions-Policy (formerly Feature-Policy)
    if (config.enablePermissionsPolicy) {
      const permissionsPolicy = [
        'geolocation=()',
        'microphone=()',
        'camera=()',
        'payment=(self)',
        'usb=()',
        'magnetometer=()',
        'gyroscope=()',
        'accelerometer=()',
      ].join(', ');
      reply.header('Permissions-Policy', permissionsPolicy);
    }

    // Additional security headers
    reply.header('X-DNS-Prefetch-Control', 'off');
    reply.header('X-Download-Options', 'noopen');
    reply.header('X-Permitted-Cross-Domain-Policies', 'none');
  };
}

/**
 * Default security headers middleware
 */
export const securityHeaders = createSecurityHeadersMiddleware();
