/**
 * Unit tests for security headers middleware
 * Phase 12: Security Hardening - Deliverable 1.2
 * 
 * Tests all security headers as specified in PHASE-12.md Section 4.5:
 * - Content-Security-Policy
 * - Strict-Transport-Security (HSTS)
 * - X-Frame-Options
 * - X-Content-Type-Options
 * - X-XSS-Protection
 * - Referrer-Policy
 * - Permissions-Policy
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createSecurityHeadersMiddleware, 
  securityHeaders,
  SecurityHeadersOptions 
} from '../../../../src/api/middleware/securityHeaders.js';

describe('Security Headers Middleware', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockRequest = {
      id: 'test-request-id',
      ip: '127.0.0.1',
      url: '/test',
      method: 'GET',
      headers: {},
    };

    mockReply = {
      header: vi.fn().mockReturnThis(),
    };
  });

  describe('createSecurityHeadersMiddleware', () => {
    it('should set all security headers with default options', async () => {
      const middleware = createSecurityHeadersMiddleware();
      await middleware(mockRequest, mockReply);

      // Content-Security-Policy
      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        expect.stringContaining("default-src 'self'")
      );

      // Strict-Transport-Security
      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        'max-age=31536000; includeSubDomains; preload'
      );

      // X-Frame-Options
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Frame-Options',
        'DENY'
      );

      // X-Content-Type-Options
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Content-Type-Options',
        'nosniff'
      );

      // X-XSS-Protection
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-XSS-Protection',
        '1; mode=block'
      );

      // Referrer-Policy
      expect(mockReply.header).toHaveBeenCalledWith(
        'Referrer-Policy',
        'strict-origin-when-cross-origin'
      );

      // Permissions-Policy
      expect(mockReply.header).toHaveBeenCalledWith(
        'Permissions-Policy',
        expect.stringContaining('geolocation=()')
      );

      // Additional security headers
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-DNS-Prefetch-Control',
        'off'
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Download-Options',
        'noopen'
      );
      expect(mockReply.header).toHaveBeenCalledWith(
        'X-Permitted-Cross-Domain-Policies',
        'none'
      );
    });

    it('should disable CSP when enableCSP is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableCSP: false });
      await middleware(mockRequest, mockReply);

      const cspCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'Content-Security-Policy'
      );
      expect(cspCalls).toHaveLength(0);
    });

    it('should disable HSTS when enableHSTS is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableHSTS: false });
      await middleware(mockRequest, mockReply);

      const hstsCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'Strict-Transport-Security'
      );
      expect(hstsCalls).toHaveLength(0);
    });

    it('should disable frame guard when enableFrameGuard is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableFrameGuard: false });
      await middleware(mockRequest, mockReply);

      const frameCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'X-Frame-Options'
      );
      expect(frameCalls).toHaveLength(0);
    });

    it('should disable content type sniffing protection when enableNoSniff is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableNoSniff: false });
      await middleware(mockRequest, mockReply);

      const noSniffCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'X-Content-Type-Options'
      );
      expect(noSniffCalls).toHaveLength(0);
    });

    it('should disable XSS filter when enableXSSFilter is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableXSSFilter: false });
      await middleware(mockRequest, mockReply);

      const xssCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'X-XSS-Protection'
      );
      expect(xssCalls).toHaveLength(0);
    });

    it('should disable referrer policy when enableReferrerPolicy is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enableReferrerPolicy: false });
      await middleware(mockRequest, mockReply);

      const referrerCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'Referrer-Policy'
      );
      expect(referrerCalls).toHaveLength(0);
    });

    it('should disable permissions policy when enablePermissionsPolicy is false', async () => {
      const middleware = createSecurityHeadersMiddleware({ enablePermissionsPolicy: false });
      await middleware(mockRequest, mockReply);

      const permissionCalls = mockReply.header.mock.calls.filter(
        (call: any) => call[0] === 'Permissions-Policy'
      );
      expect(permissionCalls).toHaveLength(0);
    });

    it('should support custom CSP directives', async () => {
      const customDirectives = {
        'default-src': ["'self'"],
        'script-src': ["'self'"],
        'style-src': ["'self'", "'unsafe-inline'"],
      };

      const middleware = createSecurityHeadersMiddleware({
        cspDirectives: customDirectives,
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"
      );
    });

    it('should support custom HSTS max-age', async () => {
      const middleware = createSecurityHeadersMiddleware({
        hstsMaxAge: 86400, // 1 day
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.stringContaining('max-age=86400')
      );
    });

    it('should exclude includeSubDomains when hstsIncludeSubdomains is false', async () => {
      const middleware = createSecurityHeadersMiddleware({
        hstsIncludeSubdomains: false,
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.not.stringContaining('includeSubDomains')
      );
    });

    it('should exclude preload when hstsPreload is false', async () => {
      const middleware = createSecurityHeadersMiddleware({
        hstsPreload: false,
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Strict-Transport-Security',
        expect.not.stringContaining('preload')
      );
    });
  });

  describe('CSP Header Construction', () => {
    it('should handle CSP directives with empty source arrays', async () => {
      const customDirectives = {
        'upgrade-insecure-requests': [],
        'default-src': ["'self'"],
      };

      const middleware = createSecurityHeadersMiddleware({
        cspDirectives: customDirectives,
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "upgrade-insecure-requests; default-src 'self'"
      );
    });

    it('should handle multiple sources per directive', async () => {
      const customDirectives = {
        'img-src': ["'self'", 'data:', 'https:', 'blob:'],
      };

      const middleware = createSecurityHeadersMiddleware({
        cspDirectives: customDirectives,
      });
      await middleware(mockRequest, mockReply);

      expect(mockReply.header).toHaveBeenCalledWith(
        'Content-Security-Policy',
        "img-src 'self' data: https: blob:"
      );
    });
  });

  describe('Default Security Headers Export', () => {
    it('should export pre-configured securityHeaders middleware', () => {
      expect(securityHeaders).toBeDefined();
      expect(typeof securityHeaders).toBe('function');
    });

    it('should apply all default headers when using securityHeaders export', async () => {
      await securityHeaders(mockRequest, mockReply);

      const headerNames = mockReply.header.mock.calls.map((call: any) => call[0]);
      
      expect(headerNames).toContain('Content-Security-Policy');
      expect(headerNames).toContain('Strict-Transport-Security');
      expect(headerNames).toContain('X-Frame-Options');
      expect(headerNames).toContain('X-Content-Type-Options');
      expect(headerNames).toContain('X-XSS-Protection');
      expect(headerNames).toContain('Referrer-Policy');
      expect(headerNames).toContain('Permissions-Policy');
      expect(headerNames).toContain('X-DNS-Prefetch-Control');
      expect(headerNames).toContain('X-Download-Options');
      expect(headerNames).toContain('X-Permitted-Cross-Domain-Policies');
    });
  });

  describe('Permissions-Policy Values', () => {
    it('should set correct permissions policy values', async () => {
      const middleware = createSecurityHeadersMiddleware();
      await middleware(mockRequest, mockReply);

      const permissionCall = mockReply.header.mock.calls.find(
        (call: any) => call[0] === 'Permissions-Policy'
      );

      expect(permissionCall[1]).toContain('geolocation=()');
      expect(permissionCall[1]).toContain('microphone=()');
      expect(permissionCall[1]).toContain('camera=()');
      expect(permissionCall[1]).toContain('payment=(self)');
      expect(permissionCall[1]).toContain('usb=()');
      expect(permissionCall[1]).toContain('magnetometer=()');
      expect(permissionCall[1]).toContain('gyroscope=()');
      expect(permissionCall[1]).toContain('accelerometer=()');
    });
  });
});
