/**
 * Unit tests for security middleware
 *
 * Covers aspects that are NOT already tested by the existing individual
 * middleware test files (securityHeaders.test.ts, rateLimit.test.ts,
 * inputValidation.test.ts, csrf.test.ts, auth.test.ts):
 *
 *  1. auditLogger middleware – Express-style admin audit logging
 *  2. LDAP injection detection (DANGEROUS_PATTERNS.LDAP_INJECTION)
 *  3. NoSQL injection detection (DANGEROUS_PATTERNS.NOSQL_INJECTION)
 *  4. Request size limiting via sanitizeString (10 000 char cap)
 *  5. COMMAND_INJECTION pattern behaviour
 *  6. Combined security-header options (partial enable / disable)
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// ─── Mock AuditLogRepository ──────────────────────────────────────────────────

const mockAuditCreate = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'audit-001' }));

vi.mock(
  '../../../../src/db/repositories/auditLog.repository.js',
  () => ({
    AuditLogRepository: vi.fn().mockImplementation(() => ({
      create: mockAuditCreate,
    })),
  })
);

// The auditLogger uses `import { … } from '../../db/repositories/auditLog.repository'`
// (without .js extension in its source – the vitest plugin resolves it).
vi.mock(
  '../../../../src/db/repositories/auditLog.repository',
  () => ({
    AuditLogRepository: vi.fn().mockImplementation(() => ({
      create: mockAuditCreate,
    })),
  })
);

// ─── Imports ──────────────────────────────────────────────────────────────────

import {
  DANGEROUS_PATTERNS,
  WHITELIST_PATTERNS,
  sanitizeString,
  sanitizeObject,
} from '../../../../src/api/middleware/inputValidation.js';

import {
  createSecurityHeadersMiddleware,
} from '../../../../src/api/middleware/securityHeaders.js';

import { auditLogger, createAuditLog } from '../../../../src/api/middleware/auditLogger.js';

// ─── 1. DANGEROUS_PATTERNS – LDAP injection ──────────────────────────────────

describe('DANGEROUS_PATTERNS.LDAP_INJECTION', () => {
  const pattern = DANGEROUS_PATTERNS.LDAP_INJECTION;

  function test(input: string): boolean {
    pattern.lastIndex = 0;
    return pattern.test(input);
  }

  it('detects asterisk wildcard in LDAP filter', () => {
    expect(test('(cn=*)')).toBe(true);
  });

  it('detects pipe character used in LDAP OR condition', () => {
    expect(test('|(uid=admin)(uid=root)')).toBe(true);
  });

  it('detects ampersand used in LDAP AND condition', () => {
    expect(test('&(uid=a)(password=b)')).toBe(true);
  });

  it('detects closing parenthesis as LDAP injection signal', () => {
    expect(test('cn=test)(objectClass=*')).toBe(true);
  });

  it('allows plain alphanumeric strings', () => {
    expect(test('john.doe')).toBe(false);
  });

  it('allows email addresses (no LDAP special chars)', () => {
    expect(test('user@example.com')).toBe(false);
  });
});

// ─── 2. DANGEROUS_PATTERNS – NoSQL injection ─────────────────────────────────

describe('DANGEROUS_PATTERNS.NOSQL_INJECTION', () => {
  const pattern = DANGEROUS_PATTERNS.NOSQL_INJECTION;

  function test(input: string): boolean {
    pattern.lastIndex = 0;
    return pattern.test(input);
  }

  it('detects $where operator', () => {
    expect(test('{ $where: "this.password == 1" }')).toBe(true);
  });

  it('detects $ne operator', () => {
    expect(test('{ "password": { $ne: "" } }')).toBe(true);
  });

  it('detects $gt operator', () => {
    expect(test('{ "age": { $gt: 18 } }')).toBe(true);
  });

  it('detects $lt operator', () => {
    expect(test('{ "score": { $lt: 100 } }')).toBe(true);
  });

  it('detects $regex operator', () => {
    expect(test('{ "email": { $regex: ".*@example.com" } }')).toBe(true);
  });

  it('detects $in operator', () => {
    expect(test('{ "role": { $in: ["admin", "root"] } }')).toBe(true);
  });

  it('detects $nin operator', () => {
    expect(test('{ "status": { $nin: ["banned"] } }')).toBe(true);
  });

  it('allows normal query strings without MongoDB operators', () => {
    expect(test('search=hello+world')).toBe(false);
  });

  it('allows plain JSON without operators', () => {
    expect(test('{"name":"Alice","age":30}')).toBe(false);
  });
});

// ─── 3. DANGEROUS_PATTERNS – COMMAND_INJECTION ───────────────────────────────

describe('DANGEROUS_PATTERNS.COMMAND_INJECTION', () => {
  const pattern = DANGEROUS_PATTERNS.COMMAND_INJECTION;

  function test(input: string): boolean {
    // The pattern is not global, but reset just in case
    pattern.lastIndex = 0;
    return pattern.test(input);
  }

  it('detects semicolon (command separator)', () => {
    expect(test('ls; rm -rf /')).toBe(true);
  });

  it('detects ampersand (background execution)', () => {
    expect(test('cmd & cmd2')).toBe(true);
  });

  it('detects pipe (command chaining)', () => {
    expect(test('cat /etc/passwd | grep root')).toBe(true);
  });

  it('detects dollar sign (variable substitution)', () => {
    expect(test('echo $HOME')).toBe(true);
  });

  it('detects opening parenthesis (sub-shell)', () => {
    expect(test('$(whoami)')).toBe(true);
  });

  it('detects backtick (command substitution)', () => {
    expect(test('`whoami`')).toBe(true);
  });

  it('allows plain alphanumeric strings', () => {
    expect(test('hello world')).toBe(false);
  });

  it('allows standard URLs without special chars', () => {
    expect(test('https://example.com/path')).toBe(false);
  });
});

// ─── 4. Request size limiting via sanitizeString ──────────────────────────────

describe('sanitizeString – request size limits', () => {
  it('returns string unchanged when below 10 000 char limit', () => {
    const input = 'a'.repeat(9999);
    const result = sanitizeString(input);
    expect(result.length).toBe(9999);
  });

  it('truncates string at exactly 10 000 chars', () => {
    const input = 'x'.repeat(10000);
    const result = sanitizeString(input);
    expect(result.length).toBe(10000);
  });

  it('truncates oversized strings to 10 000 chars', () => {
    const input = 'y'.repeat(50000);
    const result = sanitizeString(input);
    expect(result.length).toBe(10000);
  });

  it('strips null bytes before truncating', () => {
    const input = 'a\0b';
    const result = sanitizeString(input);
    expect(result).toBe('ab');
    expect(result).not.toContain('\0');
  });

  it('trims whitespace from both ends', () => {
    expect(sanitizeString('  hello  ')).toBe('hello');
  });

  it('returns empty string unchanged', () => {
    expect(sanitizeString('')).toBe('');
  });
});

// ─── 5. sanitizeObject – deep sanitisation ───────────────────────────────────

describe('sanitizeObject – deep sanitisation', () => {
  it('sanitizes nested string values', () => {
    const input = { user: { name: '  Alice  ' } };
    const result = sanitizeObject(input);
    expect(result.user.name).toBe('Alice');
  });

  it('sanitizes string values inside arrays', () => {
    const input = { tags: ['  js  ', '  ts  '] };
    const result = sanitizeObject(input);
    expect(result.tags).toEqual(['js', 'ts']);
  });

  it('returns null unchanged', () => {
    expect(sanitizeObject(null)).toBeNull();
  });

  it('returns undefined unchanged', () => {
    expect(sanitizeObject(undefined)).toBeUndefined();
  });

  it('passes non-string primitives through without modification', () => {
    const input = { count: 42, active: true };
    const result = sanitizeObject(input);
    expect(result.count).toBe(42);
    expect(result.active).toBe(true);
  });

  it('sanitizes object keys as well as values', () => {
    const input = { '  spacedKey  ': 'value' };
    const result = sanitizeObject(input);
    expect(Object.keys(result)).toContain('spacedKey');
  });
});

// ─── 6. WHITELIST_PATTERNS ────────────────────────────────────────────────────

describe('WHITELIST_PATTERNS', () => {
  describe('EMAIL pattern', () => {
    it('accepts standard email', () => {
      expect(WHITELIST_PATTERNS.EMAIL.test('user@example.com')).toBe(true);
    });

    it('accepts email with plus addressing', () => {
      expect(WHITELIST_PATTERNS.EMAIL.test('user+tag@example.com')).toBe(true);
    });

    it('accepts subdomain email', () => {
      expect(WHITELIST_PATTERNS.EMAIL.test('user@mail.example.co.uk')).toBe(true);
    });

    it('rejects email without @', () => {
      expect(WHITELIST_PATTERNS.EMAIL.test('userexample.com')).toBe(false);
    });

    it('rejects email without domain', () => {
      expect(WHITELIST_PATTERNS.EMAIL.test('user@')).toBe(false);
    });
  });

  describe('UUID pattern', () => {
    it('accepts valid v4 UUID', () => {
      expect(
        WHITELIST_PATTERNS.UUID.test('550e8400-e29b-41d4-a716-446655440000')
      ).toBe(true);
    });

    it('accepts uppercase UUID', () => {
      expect(
        WHITELIST_PATTERNS.UUID.test('550E8400-E29B-41D4-A716-446655440000')
      ).toBe(true);
    });

    it('rejects UUID with missing segment', () => {
      expect(WHITELIST_PATTERNS.UUID.test('550e8400-e29b-41d4-a716')).toBe(false);
    });

    it('rejects UUID with extra characters', () => {
      expect(
        WHITELIST_PATTERNS.UUID.test('550e8400-e29b-41d4-a716-4466554400001')
      ).toBe(false);
    });
  });

  describe('SLUG pattern', () => {
    it('accepts lower-kebab-case slug', () => {
      expect(WHITELIST_PATTERNS.SLUG.test('my-blog-post')).toBe(true);
    });

    it('accepts single-word slug', () => {
      expect(WHITELIST_PATTERNS.SLUG.test('pricing')).toBe(true);
    });

    it('rejects slug with uppercase letters', () => {
      expect(WHITELIST_PATTERNS.SLUG.test('My-Post')).toBe(false);
    });

    it('rejects slug with spaces', () => {
      expect(WHITELIST_PATTERNS.SLUG.test('my post')).toBe(false);
    });
  });

  describe('ALPHANUMERIC pattern', () => {
    it('accepts alphanumeric with dash', () => {
      expect(WHITELIST_PATTERNS.ALPHANUMERIC.test('abc-123')).toBe(true);
    });

    it('accepts underscore', () => {
      expect(WHITELIST_PATTERNS.ALPHANUMERIC.test('my_var')).toBe(true);
    });

    it('rejects special characters', () => {
      expect(WHITELIST_PATTERNS.ALPHANUMERIC.test('my@var!')).toBe(false);
    });
  });
});

// ─── 7. Security headers – partial configuration ──────────────────────────────

describe('createSecurityHeadersMiddleware – partial enable/disable', () => {
  let mockRequest: any;
  let mockReply: any;

  beforeEach(() => {
    mockRequest = { id: 'req-1', ip: '1.2.3.4', url: '/test', method: 'GET', headers: {} };
    mockReply = { header: vi.fn().mockReturnThis() };
  });

  it('omits CSP header when enableCSP is false', async () => {
    const mw = createSecurityHeadersMiddleware({ enableCSP: false });
    await mw(mockRequest, mockReply);

    const headerNames = mockReply.header.mock.calls.map((c: any[]) => c[0]);
    expect(headerNames).not.toContain('Content-Security-Policy');
  });

  it('omits HSTS header when enableHSTS is false', async () => {
    const mw = createSecurityHeadersMiddleware({ enableHSTS: false });
    await mw(mockRequest, mockReply);

    const headerNames = mockReply.header.mock.calls.map((c: any[]) => c[0]);
    expect(headerNames).not.toContain('Strict-Transport-Security');
  });

  it('omits X-Frame-Options when enableFrameGuard is false', async () => {
    const mw = createSecurityHeadersMiddleware({ enableFrameGuard: false });
    await mw(mockRequest, mockReply);

    const headerNames = mockReply.header.mock.calls.map((c: any[]) => c[0]);
    expect(headerNames).not.toContain('X-Frame-Options');
  });

  it('uses custom HSTS max-age', async () => {
    const mw = createSecurityHeadersMiddleware({ enableHSTS: true, hstsMaxAge: 86400 });
    await mw(mockRequest, mockReply);

    expect(mockReply.header).toHaveBeenCalledWith(
      'Strict-Transport-Security',
      expect.stringContaining('max-age=86400')
    );
  });

  it('omits includeSubDomains when hstsIncludeSubdomains is false', async () => {
    const mw = createSecurityHeadersMiddleware({
      enableHSTS: true,
      hstsIncludeSubdomains: false,
    });
    await mw(mockRequest, mockReply);

    const hstsCall = mockReply.header.mock.calls.find((c: any[]) =>
      c[0] === 'Strict-Transport-Security'
    );
    expect(hstsCall![1]).not.toContain('includeSubDomains');
  });

  it('omits preload directive when hstsPreload is false', async () => {
    const mw = createSecurityHeadersMiddleware({
      enableHSTS: true,
      hstsPreload: false,
    });
    await mw(mockRequest, mockReply);

    const hstsCall = mockReply.header.mock.calls.find((c: any[]) =>
      c[0] === 'Strict-Transport-Security'
    );
    expect(hstsCall![1]).not.toContain('preload');
  });

  it('CSP frame-ancestors directive prevents clickjacking', async () => {
    const mw = createSecurityHeadersMiddleware({ enableCSP: true });
    await mw(mockRequest, mockReply);

    const cspCall = mockReply.header.mock.calls.find((c: any[]) =>
      c[0] === 'Content-Security-Policy'
    );
    expect(cspCall![1]).toContain("frame-ancestors 'none'");
  });

  it('Permissions-Policy blocks geolocation and camera', async () => {
    const mw = createSecurityHeadersMiddleware({ enablePermissionsPolicy: true });
    await mw(mockRequest, mockReply);

    const ppCall = mockReply.header.mock.calls.find((c: any[]) =>
      c[0] === 'Permissions-Policy'
    );
    expect(ppCall![1]).toContain('geolocation=()');
    expect(ppCall![1]).toContain('camera=()');
  });
});

// ─── 8. auditLogger middleware ────────────────────────────────────────────────

describe('auditLogger middleware', () => {
  let mockReq: any;
  let mockRes: any;
  let mockNext: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockNext = vi.fn();

    mockReq = {
      user: { id: 'admin-001', email: 'admin@scrapifie.com' },
      params: { id: 'resource-123' },
      body: {},
      ip: '10.0.0.1',
      get: vi.fn().mockReturnValue('Mozilla/5.0 (Test)'),
    };

    // Simulate an Express response with a statusCode property
    mockRes = {
      statusCode: 200,
      json: vi.fn().mockReturnValue(mockRes),
    };
    // Make json() return itself for fluent chaining checks
    mockRes.json.mockReturnValue(mockRes);
  });

  it('calls next() to pass control to the next handler', async () => {
    const middleware = auditLogger({
      category: 'user_management',
      action: 'update_user',
      resourceType: 'user',
    });

    await middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
  });

  it('skips audit-log creation when req.user is absent', async () => {
    mockReq.user = undefined;

    const middleware = auditLogger({
      category: 'security',
      action: 'login',
      resourceType: 'session',
    });

    await middleware(mockReq, mockRes, mockNext);
    expect(mockNext).toHaveBeenCalledOnce();
    // The response json override should not create an audit log
    mockRes.json({ ok: true });
    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('creates an audit log entry on successful (2xx) response', async () => {
    const middleware = auditLogger({
      category: 'user_management',
      action: 'update_user',
      resourceType: 'user',
    });

    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 200;
    mockRes.json({ id: 'resource-123', name: 'Alice' });

    // Allow the async create to run
    await vi.waitFor(() => expect(mockAuditCreate).toHaveBeenCalled());

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-001',
        adminEmail: 'admin@scrapifie.com',
        action: 'update_user',
        category: 'user_management',
        resourceType: 'user',
        resourceId: 'resource-123',
      })
    );
  });

  it('does NOT create an audit log on error (4xx/5xx) responses', async () => {
    const middleware = auditLogger({
      category: 'security',
      action: 'delete_user',
      resourceType: 'user',
    });

    await middleware(mockReq, mockRes, mockNext);

    mockRes.statusCode = 403;
    mockRes.json({ error: 'Forbidden' });

    // Wait a tick to ensure no async side-effects ran
    await new Promise(r => setTimeout(r, 10));

    expect(mockAuditCreate).not.toHaveBeenCalled();
  });

  it('redacts password fields from audit log details', async () => {
    mockReq.body = { name: 'Alice', password: 'super-secret', token: 'tok-xyz' };

    const middleware = auditLogger({
      category: 'user_management',
      action: 'update_user',
      resourceType: 'user',
    });

    await middleware(mockReq, mockRes, mockNext);
    mockRes.statusCode = 200;
    mockRes.json({ ok: true });

    await vi.waitFor(() => expect(mockAuditCreate).toHaveBeenCalled());

    const callArg = mockAuditCreate.mock.calls[0][0];
    const reqBody = (callArg.details as any).requestBody;
    expect(reqBody.password).toBe('[REDACTED]');
    expect(reqBody.token).toBe('[REDACTED]');
    expect(reqBody.name).toBe('Alice');
  });

  it('uses getResourceId callback when provided', async () => {
    const middleware = auditLogger({
      category: 'financial',
      action: 'create_invoice',
      resourceType: 'invoice',
      getResourceId: (req) => req.params.invoiceId,
    });

    mockReq.params = { invoiceId: 'inv-555' };

    await middleware(mockReq, mockRes, mockNext);
    mockRes.statusCode = 201;
    mockRes.json({ created: true });

    await vi.waitFor(() => expect(mockAuditCreate).toHaveBeenCalled());

    const callArg = mockAuditCreate.mock.calls[0][0];
    expect(callArg.resourceId).toBe('inv-555');
  });

  it('uses getDetails callback to enrich log details', async () => {
    const middleware = auditLogger({
      category: 'operations',
      action: 'restart_service',
      resourceType: 'service',
      getDetails: (req) => ({ service: req.params.id, forced: true }),
    });

    await middleware(mockReq, mockRes, mockNext);
    mockRes.statusCode = 200;
    mockRes.json({ ok: true });

    await vi.waitFor(() => expect(mockAuditCreate).toHaveBeenCalled());

    const callArg = mockAuditCreate.mock.calls[0][0];
    expect(callArg.details).toMatchObject({ service: 'resource-123', forced: true });
  });

  it('includes IP address and user-agent in the log', async () => {
    const middleware = auditLogger({
      category: 'security',
      action: 'revoke_key',
      resourceType: 'api_key',
    });

    await middleware(mockReq, mockRes, mockNext);
    mockRes.statusCode = 200;
    mockRes.json({ revoked: true });

    await vi.waitFor(() => expect(mockAuditCreate).toHaveBeenCalled());

    const callArg = mockAuditCreate.mock.calls[0][0];
    expect(callArg.ipAddress).toBe('10.0.0.1');
    expect(callArg.userAgent).toBe('Mozilla/5.0 (Test)');
  });
});

// ─── 9. createAuditLog helper ─────────────────────────────────────────────────

describe('createAuditLog helper', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockAuditCreate.mockResolvedValue({ id: 'audit-999' });
  });

  it('creates an audit log and resolves without returning the record', async () => {
    const result = await createAuditLog(
      'admin-002',
      'admin2@scrapifie.com',
      'security',
      'login',
      'session'
    );

    expect(result).toBeUndefined();
    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        adminId: 'admin-002',
        adminEmail: 'admin2@scrapifie.com',
        category: 'security',
        action: 'login',
        resourceType: 'session',
      })
    );
  });

  it('passes optional resourceId, details, ipAddress, userAgent', async () => {
    await createAuditLog(
      'admin-003',
      'admin3@scrapifie.com',
      'financial',
      'refund',
      'payment',
      'pay-123',
      { amount: 1000 },
      '192.168.1.100',
      'curl/7.79.1'
    );

    expect(mockAuditCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        resourceId: 'pay-123',
        details: { amount: 1000 },
        ipAddress: '192.168.1.100',
        userAgent: 'curl/7.79.1',
      })
    );
  });
});
