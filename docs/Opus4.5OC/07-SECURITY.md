# Scrapifie Security Architecture

## Document Information

| Field | Value |
|-------|-------|
| Document ID | SCRX-DOC-007 |
| Version | 1.0.0 |
| Last Updated | 2025-01-31 |
| Author | Security Team |
| Status | Draft |
| Classification | Internal - Confidential |

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Security Architecture Overview](#2-security-architecture-overview)
3. [Authentication and API Keys](#3-authentication-and-api-keys)
4. [Authorization and Access Control](#4-authorization-and-access-control)
5. [Rate Limiting and Throttling](#5-rate-limiting-and-throttling)
6. [Abuse Detection and Prevention](#6-abuse-detection-and-prevention)
7. [DDoS Protection](#7-ddos-protection)
8. [Data Security](#8-data-security)
9. [Infrastructure Security](#9-infrastructure-security)
10. [Audit Logging and Compliance](#10-audit-logging-and-compliance)
11. [Incident Response](#11-incident-response)
12. [Appendix](#12-appendix)

---

## 1. Introduction

### 1.1 Purpose

This document defines the comprehensive security architecture for Scrapifie, covering authentication, authorization, rate limiting, abuse prevention, and infrastructure security.

### 1.2 Security Objectives

| Objective | Description | Priority |
|-----------|-------------|----------|
| **Confidentiality** | Protect customer data and API keys | Critical |
| **Integrity** | Ensure data accuracy and prevent tampering | Critical |
| **Availability** | Maintain 99.9% uptime, resist DDoS | High |
| **Accountability** | Complete audit trail for all actions | High |
| **Non-repudiation** | Prove origin and authenticity of requests | Medium |

### 1.3 Threat Model Summary

| Threat Category | Examples | Mitigations |
|-----------------|----------|-------------|
| Credential Theft | API key leakage, brute force | Key rotation, rate limiting, anomaly detection |
| Abuse | Excessive usage, ToS violations | Usage limits, behavior analysis, account suspension |
| DDoS | Volumetric attacks, application layer | CDN, rate limiting, auto-scaling |
| Data Breach | SQL injection, unauthorized access | Input validation, encryption, access controls |
| Insider Threat | Employee misuse | Audit logging, least privilege, key management |

---

## 2. Security Architecture Overview

### 2.1 Defense in Depth

```
+------------------------------------------------------------------+
|                    SECURITY ARCHITECTURE                          |
+------------------------------------------------------------------+
|                                                                   |
|  LAYER 1: EDGE PROTECTION                                        |
|  +----------------------------------------------------------+    |
|  |  Cloudflare / HAProxy                                     |    |
|  |  - DDoS mitigation                                        |    |
|  |  - WAF rules                                              |    |
|  |  - SSL/TLS termination                                    |    |
|  |  - IP reputation filtering                                |    |
|  +----------------------------------------------------------+    |
|                              |                                    |
|  LAYER 2: API GATEWAY                                            |
|  +----------------------------------------------------------+    |
|  |  Fastify API Server                                       |    |
|  |  - Request validation                                     |    |
|  |  - Rate limiting (per-key, per-IP)                        |    |
|  |  - Authentication                                         |    |
|  |  - Request logging                                        |    |
|  +----------------------------------------------------------+    |
|                              |                                    |
|  LAYER 3: APPLICATION SECURITY                                   |
|  +----------------------------------------------------------+    |
|  |  Business Logic                                           |    |
|  |  - Authorization (RBAC)                                   |    |
|  |  - Input sanitization                                     |    |
|  |  - Output encoding                                        |    |
|  |  - Abuse detection                                        |    |
|  +----------------------------------------------------------+    |
|                              |                                    |
|  LAYER 4: DATA SECURITY                                          |
|  +----------------------------------------------------------+    |
|  |  PostgreSQL / Redis / MinIO                               |    |
|  |  - Encryption at rest                                     |    |
|  |  - Encryption in transit                                  |    |
|  |  - Access controls                                        |    |
|  |  - Audit logging                                          |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 2.2 Security Components

| Component | Technology | Purpose |
|-----------|------------|---------|
| Edge Protection | Cloudflare | DDoS, WAF, SSL |
| API Gateway | Fastify + custom plugins | Auth, rate limiting |
| Secret Management | HashiCorp Vault | API key encryption |
| Audit Logging | PostgreSQL + S3 | Compliance, forensics |
| Intrusion Detection | Fail2ban + custom | Automated blocking |
| Vulnerability Scanning | Trivy, Snyk | Container/dependency scanning |

---

## 3. Authentication and API Keys

### 3.1 API Key Format and Generation

```typescript
// services/api-keys.ts

import { randomBytes, createHash, createCipheriv, createDecipheriv } from 'crypto';

// API Key format: scrx_{environment}_{random_32_chars}
// Example: scrx_live_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6

interface ApiKey {
  full: string;           // Full key (shown once at creation)
  prefix: string;         // First 12 chars for identification
  hash: string;           // SHA-256 hash for storage
}

const KEY_PREFIX = 'scrx';
const ENVIRONMENTS = ['live', 'test'] as const;

export function generateApiKey(environment: 'live' | 'test' = 'live'): ApiKey {
  // Generate 32 bytes of random data
  const randomPart = randomBytes(32)
    .toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 32);
  
  const full = `${KEY_PREFIX}_${environment}_${randomPart}`;
  const prefix = full.substring(0, 16);
  const hash = hashApiKey(full);
  
  return { full, prefix, hash };
}

export function hashApiKey(key: string): string {
  return createHash('sha256').update(key).digest('hex');
}

export function validateApiKeyFormat(key: string): boolean {
  const pattern = /^scrx_(live|test)_[a-zA-Z0-9]{32}$/;
  return pattern.test(key);
}

// Encrypt sensitive data for storage
const ENCRYPTION_KEY = Buffer.from(process.env.API_KEY_ENCRYPTION_KEY!, 'hex');
const IV_LENGTH = 16;

export function encryptSensitiveData(data: string): string {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag().toString('hex');
  
  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decryptSensitiveData(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');
  
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  
  const decipher = createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  
  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');
  
  return decrypted;
}
```

### 3.2 API Key Validation Middleware

```typescript
// middleware/auth.ts

import { FastifyRequest, FastifyReply } from 'fastify';
import { Redis } from 'ioredis';
import { Pool } from 'pg';

interface AuthenticatedRequest extends FastifyRequest {
  apiKey: ApiKeyRecord;
  organization: OrganizationRecord;
}

interface ApiKeyRecord {
  id: string;
  organizationId: string;
  keyPrefix: string;
  scopes: string[];
  rateLimit: number;
  maxConcurrent: number;
  allowedIps: string[] | null;
  allowedDomains: string[] | null;
  environment: 'live' | 'test';
  isActive: boolean;
}

const CACHE_TTL = 300; // 5 minutes

export async function authenticateRequest(
  request: FastifyRequest,
  reply: FastifyReply,
  redis: Redis,
  db: Pool,
): Promise<void> {
  // Extract API key from header
  const authHeader = request.headers['authorization'];
  
  if (!authHeader) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'Missing Authorization header',
    });
  }
  
  // Support both "Bearer" and "Api-Key" prefixes
  let apiKey: string;
  if (authHeader.startsWith('Bearer ')) {
    apiKey = authHeader.substring(7);
  } else if (authHeader.startsWith('Api-Key ')) {
    apiKey = authHeader.substring(8);
  } else {
    apiKey = authHeader;
  }
  
  // Validate format
  if (!validateApiKeyFormat(apiKey)) {
    return reply.status(401).send({
      error: 'unauthorized',
      message: 'Invalid API key format',
    });
  }
  
  // Hash the key
  const keyHash = hashApiKey(apiKey);
  
  // Check cache first
  const cacheKey = `scrx:auth:${keyHash}`;
  let keyRecord: ApiKeyRecord | null = null;
  
  const cached = await redis.get(cacheKey);
  if (cached) {
    keyRecord = JSON.parse(cached);
  } else {
    // Fetch from database
    const result = await db.query(`
      SELECT 
        ak.id,
        ak.organization_id,
        ak.key_prefix,
        ak.scopes,
        ak.rate_limit_override,
        ak.max_concurrent_override,
        ak.allowed_ips,
        ak.allowed_domains,
        ak.environment,
        ak.is_active,
        ak.expires_at,
        o.rate_limit_per_second as org_rate_limit,
        o.max_concurrent_jobs as org_max_concurrent,
        o.subscription_status
      FROM api_keys ak
      JOIN organizations o ON o.id = ak.organization_id
      WHERE ak.key_hash = $1
        AND ak.is_active = true
        AND o.deleted_at IS NULL
    `, [keyHash]);
    
    if (result.rows.length === 0) {
      // Log failed authentication attempt
      await logAuthFailure(request, keyHash.substring(0, 16), redis);
      
      return reply.status(401).send({
        error: 'unauthorized',
        message: 'Invalid API key',
      });
    }
    
    const row = result.rows[0];
    
    // Check expiration
    if (row.expires_at && new Date(row.expires_at) < new Date()) {
      return reply.status(401).send({
        error: 'unauthorized',
        message: 'API key has expired',
      });
    }
    
    // Check subscription status
    if (row.subscription_status === 'canceled' || row.subscription_status === 'unpaid') {
      return reply.status(403).send({
        error: 'forbidden',
        message: 'Subscription is not active',
      });
    }
    
    keyRecord = {
      id: row.id,
      organizationId: row.organization_id,
      keyPrefix: row.key_prefix,
      scopes: row.scopes,
      rateLimit: row.rate_limit_override || row.org_rate_limit,
      maxConcurrent: row.max_concurrent_override || row.org_max_concurrent,
      allowedIps: row.allowed_ips,
      allowedDomains: row.allowed_domains,
      environment: row.environment,
      isActive: row.is_active,
    };
    
    // Cache for future requests
    await redis.set(cacheKey, JSON.stringify(keyRecord), 'EX', CACHE_TTL);
  }
  
  // Validate IP restrictions
  if (keyRecord.allowedIps && keyRecord.allowedIps.length > 0) {
    const clientIp = getClientIp(request);
    if (!keyRecord.allowedIps.includes(clientIp)) {
      return reply.status(403).send({
        error: 'forbidden',
        message: 'IP address not allowed',
      });
    }
  }
  
  // Validate domain restrictions
  if (keyRecord.allowedDomains && keyRecord.allowedDomains.length > 0) {
    const origin = request.headers['origin'];
    if (origin) {
      const originDomain = new URL(origin).hostname;
      const allowed = keyRecord.allowedDomains.some(d => 
        originDomain === d || originDomain.endsWith(`.${d}`),
      );
      if (!allowed) {
        return reply.status(403).send({
          error: 'forbidden',
          message: 'Origin domain not allowed',
        });
      }
    }
  }
  
  // Update last used timestamp (async, non-blocking)
  updateKeyUsage(keyRecord.id, getClientIp(request), db).catch(() => {});
  
  // Attach to request
  (request as AuthenticatedRequest).apiKey = keyRecord;
}

async function logAuthFailure(
  request: FastifyRequest,
  keyPrefix: string,
  redis: Redis,
): Promise<void> {
  const clientIp = getClientIp(request);
  const failureKey = `scrx:auth:failures:${clientIp}`;
  
  // Increment failure count
  const failures = await redis.incr(failureKey);
  await redis.expire(failureKey, 3600); // 1 hour window
  
  // Log to audit trail
  await redis.lpush('scrx:audit:auth_failures', JSON.stringify({
    timestamp: new Date().toISOString(),
    ip: clientIp,
    keyPrefix,
    userAgent: request.headers['user-agent'],
    failures,
  }));
  
  // Alert on repeated failures
  if (failures >= 10) {
    await redis.publish('scrx:alerts', JSON.stringify({
      type: 'auth_brute_force',
      ip: clientIp,
      failures,
    }));
  }
}

async function updateKeyUsage(
  keyId: string,
  ip: string,
  db: Pool,
): Promise<void> {
  await db.query(`
    UPDATE api_keys 
    SET last_used_at = NOW(),
        last_used_ip = $1,
        usage_count = usage_count + 1
    WHERE id = $2
  `, [ip, keyId]);
}

function getClientIp(request: FastifyRequest): string {
  // Check various headers for proxied requests
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    return (forwardedFor as string).split(',')[0].trim();
  }
  
  const realIp = request.headers['x-real-ip'];
  if (realIp) {
    return realIp as string;
  }
  
  return request.ip;
}
```

### 3.3 API Key Rotation

```typescript
// services/key-rotation.ts

interface RotationResult {
  newKey: ApiKey;
  oldKeyExpiresAt: Date;
}

export async function rotateApiKey(
  keyId: string,
  gracePeriodHours: number = 24,
  db: Pool,
): Promise<RotationResult> {
  const client = await db.connect();
  
  try {
    await client.query('BEGIN');
    
    // Get existing key
    const existing = await client.query(
      'SELECT * FROM api_keys WHERE id = $1',
      [keyId],
    );
    
    if (existing.rows.length === 0) {
      throw new Error('API key not found');
    }
    
    const oldKey = existing.rows[0];
    const gracePeriodEnd = new Date(Date.now() + gracePeriodHours * 60 * 60 * 1000);
    
    // Generate new key
    const newApiKey = generateApiKey(oldKey.environment);
    
    // Insert new key with same settings
    await client.query(`
      INSERT INTO api_keys (
        organization_id, created_by_user_id, key_prefix, key_hash,
        name, description, scopes, allowed_ips, allowed_domains,
        rate_limit_override, max_concurrent_override, environment,
        is_active, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, true, NOW())
    `, [
      oldKey.organization_id,
      oldKey.created_by_user_id,
      newApiKey.prefix,
      newApiKey.hash,
      `${oldKey.name} (rotated)`,
      oldKey.description,
      oldKey.scopes,
      oldKey.allowed_ips,
      oldKey.allowed_domains,
      oldKey.rate_limit_override,
      oldKey.max_concurrent_override,
      oldKey.environment,
    ]);
    
    // Set expiration on old key (grace period)
    await client.query(`
      UPDATE api_keys 
      SET expires_at = $1,
          updated_at = NOW()
      WHERE id = $2
    `, [gracePeriodEnd, keyId]);
    
    await client.query('COMMIT');
    
    return {
      newKey: newApiKey,
      oldKeyExpiresAt: gracePeriodEnd,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Automatic rotation policy
export async function enforceRotationPolicy(db: Pool): Promise<void> {
  // Find keys older than 90 days without rotation
  const staleKeys = await db.query(`
    SELECT ak.id, ak.organization_id, ak.name, u.email
    FROM api_keys ak
    JOIN organizations o ON o.id = ak.organization_id
    JOIN users u ON u.organization_id = o.id AND u.role = 'owner'
    WHERE ak.created_at < NOW() - INTERVAL '90 days'
      AND ak.is_active = true
      AND ak.expires_at IS NULL
      AND NOT EXISTS (
        SELECT 1 FROM api_keys newer
        WHERE newer.organization_id = ak.organization_id
          AND newer.created_at > ak.created_at
          AND newer.is_active = true
      )
  `);
  
  for (const key of staleKeys.rows) {
    // Send rotation reminder email
    await sendRotationReminder(key.email, key.name);
  }
}
```

---

## 4. Authorization and Access Control

### 4.1 Role-Based Access Control (RBAC)

```typescript
// authorization/rbac.ts

type Role = 'owner' | 'admin' | 'member' | 'readonly';
type Permission = 
  | 'organization:read' | 'organization:update' | 'organization:delete'
  | 'users:read' | 'users:create' | 'users:update' | 'users:delete'
  | 'api_keys:read' | 'api_keys:create' | 'api_keys:delete' | 'api_keys:rotate'
  | 'billing:read' | 'billing:update'
  | 'scrape:read' | 'scrape:write'
  | 'jobs:read' | 'jobs:cancel'
  | 'usage:read';

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  owner: [
    'organization:read', 'organization:update', 'organization:delete',
    'users:read', 'users:create', 'users:update', 'users:delete',
    'api_keys:read', 'api_keys:create', 'api_keys:delete', 'api_keys:rotate',
    'billing:read', 'billing:update',
    'scrape:read', 'scrape:write',
    'jobs:read', 'jobs:cancel',
    'usage:read',
  ],
  admin: [
    'organization:read', 'organization:update',
    'users:read', 'users:create', 'users:update',
    'api_keys:read', 'api_keys:create', 'api_keys:delete', 'api_keys:rotate',
    'billing:read',
    'scrape:read', 'scrape:write',
    'jobs:read', 'jobs:cancel',
    'usage:read',
  ],
  member: [
    'organization:read',
    'users:read',
    'api_keys:read',
    'scrape:read', 'scrape:write',
    'jobs:read', 'jobs:cancel',
    'usage:read',
  ],
  readonly: [
    'organization:read',
    'users:read',
    'api_keys:read',
    'scrape:read',
    'jobs:read',
    'usage:read',
  ],
};

export function hasPermission(role: Role, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: Role, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

export function hasAllPermissions(role: Role, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Middleware for permission checking
export function requirePermission(...permissions: Permission[]) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const user = request.user;
    
    if (!user) {
      return reply.status(401).send({
        error: 'unauthorized',
        message: 'Authentication required',
      });
    }
    
    const hasAccess = permissions.length === 1
      ? hasPermission(user.role, permissions[0])
      : hasAnyPermission(user.role, permissions);
    
    if (!hasAccess) {
      return reply.status(403).send({
        error: 'forbidden',
        message: 'Insufficient permissions',
        required: permissions,
      });
    }
  };
}
```

### 4.2 API Key Scopes

```typescript
// authorization/scopes.ts

type Scope = 
  | 'scrape:read'      // Read scrape results
  | 'scrape:write'     // Create scrape jobs
  | 'jobs:read'        // Read job status
  | 'jobs:cancel'      // Cancel jobs
  | 'usage:read'       // Read usage data
  | 'webhooks:manage'  // Manage webhook settings
  | 'account:read';    // Read account info

const SCOPE_HIERARCHY: Record<Scope, Scope[]> = {
  'scrape:read': [],
  'scrape:write': ['scrape:read'],
  'jobs:read': [],
  'jobs:cancel': ['jobs:read'],
  'usage:read': [],
  'webhooks:manage': [],
  'account:read': [],
};

export function hasScope(grantedScopes: Scope[], requiredScope: Scope): boolean {
  // Direct match
  if (grantedScopes.includes(requiredScope)) {
    return true;
  }
  
  // Check hierarchy (e.g., scrape:write implies scrape:read)
  for (const granted of grantedScopes) {
    const implies = SCOPE_HIERARCHY[granted] || [];
    if (implies.includes(requiredScope)) {
      return true;
    }
  }
  
  return false;
}

export function requireScope(scope: Scope) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const apiKey = (request as AuthenticatedRequest).apiKey;
    
    if (!hasScope(apiKey.scopes, scope)) {
      return reply.status(403).send({
        error: 'forbidden',
        message: `API key missing required scope: ${scope}`,
      });
    }
  };
}

// Validate scopes when creating API key
export function validateScopes(scopes: string[]): boolean {
  const validScopes = Object.keys(SCOPE_HIERARCHY);
  return scopes.every(s => validScopes.includes(s));
}
```

---

## 5. Rate Limiting and Throttling

### 5.1 Multi-Layer Rate Limiting

```
+------------------------------------------------------------------+
|                     RATE LIMITING LAYERS                          |
+------------------------------------------------------------------+
|                                                                   |
|  LAYER 1: GLOBAL (Cloudflare)                                    |
|  +----------------------------------------------------------+    |
|  |  - 10,000 requests/min per IP                            |    |
|  |  - Connection limits                                      |    |
|  |  - Bot detection                                          |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 2: PER-IP (API Gateway)                                   |
|  +----------------------------------------------------------+    |
|  |  - 100 requests/sec per IP (unauthenticated)             |    |
|  |  - 1,000 requests/sec per IP (authenticated)             |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 3: PER-KEY (Application)                                  |
|  +----------------------------------------------------------+    |
|  |  - Based on subscription tier                             |    |
|  |  - Starter: 10/sec, Growth: 50/sec, Business: 200/sec    |    |
|  +----------------------------------------------------------+    |
|                                                                   |
|  LAYER 4: PER-ORGANIZATION (Application)                         |
|  +----------------------------------------------------------+    |
|  |  - Concurrent job limits                                  |    |
|  |  - Daily/monthly credit limits                            |    |
|  +----------------------------------------------------------+    |
|                                                                   |
+------------------------------------------------------------------+
```

### 5.2 Rate Limiter Implementation

```typescript
// middleware/rate-limiter.ts

import { Redis } from 'ioredis';

interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: Date;
  retryAfter?: number;
}

interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

// Sliding window log algorithm
export class SlidingWindowRateLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async check(
    key: string,
    config: RateLimitConfig,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const windowStart = now - config.windowMs;
    const redisKey = `scrx:ratelimit:${key}`;
    
    // Use Lua script for atomic operation
    const result = await this.redis.eval(`
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local windowStart = tonumber(ARGV[2])
      local maxRequests = tonumber(ARGV[3])
      local windowMs = tonumber(ARGV[4])
      
      -- Remove old entries
      redis.call('ZREMRANGEBYSCORE', key, '-inf', windowStart)
      
      -- Count current entries
      local count = redis.call('ZCARD', key)
      
      if count < maxRequests then
        -- Add new entry with unique score
        redis.call('ZADD', key, now, now .. ':' .. math.random(1000000))
        redis.call('PEXPIRE', key, windowMs)
        return {1, maxRequests - count - 1, 0}
      else
        -- Get oldest entry to calculate retry-after
        local oldest = redis.call('ZRANGE', key, 0, 0, 'WITHSCORES')
        local retryAfter = 0
        if oldest[2] then
          retryAfter = math.ceil((oldest[2] + windowMs - now) / 1000)
        end
        return {0, 0, retryAfter}
      end
    `, 1, redisKey, now, windowStart, config.maxRequests, config.windowMs) as [number, number, number];
    
    const [allowed, remaining, retryAfter] = result;
    
    return {
      allowed: allowed === 1,
      remaining,
      resetAt: new Date(now + config.windowMs),
      retryAfter: retryAfter > 0 ? retryAfter : undefined,
    };
  }
}

// Token bucket algorithm (for bursting)
export class TokenBucketRateLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async consume(
    key: string,
    tokensPerSecond: number,
    bucketSize: number,
    tokensToConsume: number = 1,
  ): Promise<RateLimitResult> {
    const now = Date.now();
    const redisKey = `scrx:tokenbucket:${key}`;
    
    const result = await this.redis.eval(`
      local key = KEYS[1]
      local now = tonumber(ARGV[1])
      local rate = tonumber(ARGV[2])
      local capacity = tonumber(ARGV[3])
      local requested = tonumber(ARGV[4])
      
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now
      
      -- Calculate tokens to add based on time elapsed
      local elapsed = (now - lastRefill) / 1000
      local tokensToAdd = elapsed * rate
      tokens = math.min(capacity, tokens + tokensToAdd)
      
      if tokens >= requested then
        tokens = tokens - requested
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('PEXPIRE', key, 60000)
        return {1, math.floor(tokens), 0}
      else
        -- Calculate wait time for enough tokens
        local tokensNeeded = requested - tokens
        local waitTime = math.ceil(tokensNeeded / rate)
        return {0, 0, waitTime}
      end
    `, 1, redisKey, now, tokensPerSecond, bucketSize, tokensToConsume) as [number, number, number];
    
    const [allowed, remaining, retryAfter] = result;
    
    return {
      allowed: allowed === 1,
      remaining,
      resetAt: new Date(now + (retryAfter * 1000)),
      retryAfter: retryAfter > 0 ? retryAfter : undefined,
    };
  }
}

// Rate limit middleware
export function rateLimitMiddleware(
  limiter: SlidingWindowRateLimiter | TokenBucketRateLimiter,
) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    const apiKey = (request as AuthenticatedRequest).apiKey;
    const config = {
      windowMs: 1000, // 1 second
      maxRequests: apiKey.rateLimit,
    };
    
    const result = await (limiter as SlidingWindowRateLimiter).check(
      `org:${apiKey.organizationId}`,
      config,
    );
    
    // Set rate limit headers
    reply.header('X-RateLimit-Limit', config.maxRequests);
    reply.header('X-RateLimit-Remaining', result.remaining);
    reply.header('X-RateLimit-Reset', Math.ceil(result.resetAt.getTime() / 1000));
    
    if (!result.allowed) {
      reply.header('Retry-After', result.retryAfter);
      return reply.status(429).send({
        error: 'rate_limit_exceeded',
        message: 'Too many requests',
        retryAfter: result.retryAfter,
      });
    }
  };
}
```

### 5.3 Concurrent Job Limiting

```typescript
// middleware/concurrency-limiter.ts

export class ConcurrencyLimiter {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async acquire(
    organizationId: string,
    jobId: string,
    maxConcurrent: number,
    ttlSeconds: number = 3600,
  ): Promise<boolean> {
    const key = `scrx:concurrent:${organizationId}`;
    
    const result = await this.redis.eval(`
      local key = KEYS[1]
      local jobId = ARGV[1]
      local maxConcurrent = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      
      local count = redis.call('SCARD', key)
      if count < maxConcurrent then
        redis.call('SADD', key, jobId)
        redis.call('EXPIRE', key, ttl)
        return 1
      else
        return 0
      end
    `, 1, key, jobId, maxConcurrent, ttlSeconds) as number;
    
    return result === 1;
  }
  
  async release(organizationId: string, jobId: string): Promise<void> {
    const key = `scrx:concurrent:${organizationId}`;
    await this.redis.srem(key, jobId);
  }
  
  async getCount(organizationId: string): Promise<number> {
    const key = `scrx:concurrent:${organizationId}`;
    return this.redis.scard(key);
  }
  
  async getActiveJobs(organizationId: string): Promise<string[]> {
    const key = `scrx:concurrent:${organizationId}`;
    return this.redis.smembers(key);
  }
  
  // Cleanup stale jobs (failsafe)
  async cleanup(organizationId: string, db: Pool): Promise<number> {
    const activeJobs = await this.getActiveJobs(organizationId);
    
    if (activeJobs.length === 0) return 0;
    
    // Check which jobs are actually still running
    const result = await db.query(`
      SELECT id FROM scrape_jobs
      WHERE id = ANY($1)
        AND status IN ('pending', 'queued', 'running')
    `, [activeJobs]);
    
    const runningJobIds = new Set(result.rows.map(r => r.id));
    const staleJobs = activeJobs.filter(id => !runningJobIds.has(id));
    
    if (staleJobs.length > 0) {
      const key = `scrx:concurrent:${organizationId}`;
      await this.redis.srem(key, ...staleJobs);
    }
    
    return staleJobs.length;
  }
}
```

---

## 6. Abuse Detection and Prevention

### 6.1 Abuse Detection System

```typescript
// services/abuse-detection.ts

interface AbuseSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  score: number;
  details: Record<string, any>;
}

interface AbuseAnalysis {
  organizationId: string;
  riskScore: number;
  signals: AbuseSignal[];
  recommendation: 'allow' | 'warn' | 'throttle' | 'block';
}

export class AbuseDetector {
  private redis: Redis;
  private db: Pool;
  
  constructor(redis: Redis, db: Pool) {
    this.redis = redis;
    this.db = db;
  }
  
  async analyze(organizationId: string): Promise<AbuseAnalysis> {
    const signals: AbuseSignal[] = [];
    
    // Check for various abuse patterns
    const [
      requestPatterns,
      targetPatterns,
      errorPatterns,
      paymentPatterns,
    ] = await Promise.all([
      this.analyzeRequestPatterns(organizationId),
      this.analyzeTargetPatterns(organizationId),
      this.analyzeErrorPatterns(organizationId),
      this.analyzePaymentPatterns(organizationId),
    ]);
    
    signals.push(...requestPatterns, ...targetPatterns, ...errorPatterns, ...paymentPatterns);
    
    // Calculate overall risk score
    const riskScore = signals.reduce((sum, s) => sum + s.score, 0);
    
    // Determine recommendation
    let recommendation: 'allow' | 'warn' | 'throttle' | 'block';
    if (riskScore >= 80) {
      recommendation = 'block';
    } else if (riskScore >= 60) {
      recommendation = 'throttle';
    } else if (riskScore >= 40) {
      recommendation = 'warn';
    } else {
      recommendation = 'allow';
    }
    
    return {
      organizationId,
      riskScore,
      signals,
      recommendation,
    };
  }
  
  private async analyzeRequestPatterns(orgId: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    
    // Check for unusual request velocity
    const recentRequests = await this.redis.zcount(
      `scrx:requests:${orgId}`,
      Date.now() - 3600000, // Last hour
      '+inf',
    );
    
    const avgHourlyRequests = await this.getAverageHourlyRequests(orgId);
    
    if (recentRequests > avgHourlyRequests * 10) {
      signals.push({
        type: 'request_spike',
        severity: 'high',
        score: 30,
        details: {
          current: recentRequests,
          average: avgHourlyRequests,
          multiplier: recentRequests / avgHourlyRequests,
        },
      });
    }
    
    // Check for suspicious timing patterns (scripted attacks)
    const requestTiming = await this.getRequestTimingVariance(orgId);
    if (requestTiming.variance < 0.01) {
      signals.push({
        type: 'automated_pattern',
        severity: 'medium',
        score: 20,
        details: {
          variance: requestTiming.variance,
          pattern: 'uniform_timing',
        },
      });
    }
    
    return signals;
  }
  
  private async analyzeTargetPatterns(orgId: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    
    // Check for targeting sensitive/prohibited sites
    const prohibitedDomains = await this.getProhibitedDomainHits(orgId);
    if (prohibitedDomains.length > 0) {
      signals.push({
        type: 'prohibited_targets',
        severity: 'critical',
        score: 50,
        details: {
          domains: prohibitedDomains,
          count: prohibitedDomains.length,
        },
      });
    }
    
    // Check for excessive single-domain targeting
    const topDomain = await this.getTopTargetDomain(orgId);
    if (topDomain.percentage > 90) {
      signals.push({
        type: 'single_domain_focus',
        severity: 'medium',
        score: 15,
        details: {
          domain: topDomain.domain,
          percentage: topDomain.percentage,
        },
      });
    }
    
    return signals;
  }
  
  private async analyzeErrorPatterns(orgId: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    
    // High error rate might indicate abuse or attack
    const errorRate = await this.getErrorRate(orgId);
    if (errorRate > 0.5) {
      signals.push({
        type: 'high_error_rate',
        severity: 'medium',
        score: 20,
        details: {
          errorRate,
          threshold: 0.5,
        },
      });
    }
    
    // Many blocked/rate-limited requests
    const blockedRate = await this.getBlockedRate(orgId);
    if (blockedRate > 0.3) {
      signals.push({
        type: 'high_blocked_rate',
        severity: 'high',
        score: 25,
        details: {
          blockedRate,
          pattern: 'aggressive_scraping',
        },
      });
    }
    
    return signals;
  }
  
  private async analyzePaymentPatterns(orgId: string): Promise<AbuseSignal[]> {
    const signals: AbuseSignal[] = [];
    
    // Check payment history
    const paymentHistory = await this.db.query(`
      SELECT status, COUNT(*) as count
      FROM invoices
      WHERE organization_id = $1
        AND created_at > NOW() - INTERVAL '6 months'
      GROUP BY status
    `, [orgId]);
    
    const failedPayments = paymentHistory.rows.find(r => r.status === 'uncollectible')?.count || 0;
    const totalPayments = paymentHistory.rows.reduce((sum, r) => sum + parseInt(r.count), 0);
    
    if (failedPayments > 0 && failedPayments / totalPayments > 0.2) {
      signals.push({
        type: 'payment_issues',
        severity: 'high',
        score: 25,
        details: {
          failedPayments,
          totalPayments,
          failureRate: failedPayments / totalPayments,
        },
      });
    }
    
    return signals;
  }
  
  // Helper methods (implementation details)
  private async getAverageHourlyRequests(orgId: string): Promise<number> {
    const result = await this.db.query(`
      SELECT AVG(total_requests) as avg_requests
      FROM usage_records
      WHERE organization_id = $1
        AND period_start > NOW() - INTERVAL '7 days'
    `, [orgId]);
    return parseFloat(result.rows[0]?.avg_requests || '100');
  }
  
  private async getRequestTimingVariance(orgId: string): Promise<{ variance: number }> {
    // Implementation would analyze timing between requests
    return { variance: 0.5 };
  }
  
  private async getProhibitedDomainHits(orgId: string): Promise<string[]> {
    // Check against list of prohibited domains
    return [];
  }
  
  private async getTopTargetDomain(orgId: string): Promise<{ domain: string; percentage: number }> {
    return { domain: 'example.com', percentage: 50 };
  }
  
  private async getErrorRate(orgId: string): Promise<number> {
    return 0.1;
  }
  
  private async getBlockedRate(orgId: string): Promise<number> {
    return 0.05;
  }
}

// Abuse response actions
export async function handleAbuseDetection(
  analysis: AbuseAnalysis,
  db: Pool,
  redis: Redis,
): Promise<void> {
  const { organizationId, recommendation, signals, riskScore } = analysis;
  
  // Log abuse analysis
  await db.query(`
    INSERT INTO abuse_logs (organization_id, risk_score, signals, recommendation, created_at)
    VALUES ($1, $2, $3, $4, NOW())
  `, [organizationId, riskScore, JSON.stringify(signals), recommendation]);
  
  switch (recommendation) {
    case 'warn':
      // Send warning email to organization owner
      await redis.lpush('notifications:email', JSON.stringify({
        type: 'abuse_warning',
        organizationId,
        signals: signals.filter(s => s.severity !== 'low'),
      }));
      break;
      
    case 'throttle':
      // Temporarily reduce rate limits
      await redis.set(
        `scrx:throttle:${organizationId}`,
        JSON.stringify({ factor: 0.5, until: Date.now() + 3600000 }),
        'EX', 3600,
      );
      break;
      
    case 'block':
      // Suspend account pending review
      await db.query(`
        UPDATE organizations 
        SET subscription_status = 'suspended',
            metadata = jsonb_set(metadata, '{suspension_reason}', $2)
        WHERE id = $1
      `, [organizationId, JSON.stringify('Abuse detected')]);
      
      // Invalidate all API key caches
      const keys = await db.query(
        'SELECT key_hash FROM api_keys WHERE organization_id = $1',
        [organizationId],
      );
      for (const key of keys.rows) {
        await redis.del(`scrx:auth:${key.key_hash}`);
      }
      break;
  }
}
```

### 6.2 Prohibited Content Detection

```typescript
// services/content-policy.ts

interface ContentPolicyResult {
  allowed: boolean;
  violations: string[];
  targetRisk: 'low' | 'medium' | 'high';
}

const PROHIBITED_DOMAINS = new Set([
  // Government/Military
  '.gov', '.mil', '.gov.uk', '.gov.au',
  // Financial infrastructure
  'visa.com', 'mastercard.com', 'paypal.com', 'stripe.com',
  // Healthcare
  '.nhs.uk', 'healthcare.gov',
  // Critical infrastructure
  // ... more domains
]);

const PROHIBITED_PATTERNS = [
  /\/admin\//i,
  /\/wp-admin\//i,
  /\/login/i,
  /\/signin/i,
  /\/password/i,
  /\/api\/v\d+\/internal/i,
];

export function checkContentPolicy(url: string): ContentPolicyResult {
  const violations: string[] = [];
  let targetRisk: 'low' | 'medium' | 'high' = 'low';
  
  try {
    const parsed = new URL(url);
    const domain = parsed.hostname.toLowerCase();
    
    // Check prohibited domains
    for (const prohibited of PROHIBITED_DOMAINS) {
      if (domain === prohibited || domain.endsWith(prohibited)) {
        violations.push(`Prohibited domain: ${prohibited}`);
        targetRisk = 'high';
      }
    }
    
    // Check prohibited URL patterns
    const fullPath = parsed.pathname + parsed.search;
    for (const pattern of PROHIBITED_PATTERNS) {
      if (pattern.test(fullPath)) {
        violations.push(`Prohibited URL pattern: ${pattern.source}`);
        targetRisk = 'high';
      }
    }
    
    // Check for local/private IPs
    if (isPrivateIP(domain)) {
      violations.push('Private/local IP addresses not allowed');
      targetRisk = 'high';
    }
    
    // Check for suspicious ports
    if (parsed.port && !['80', '443', '8080', '8443'].includes(parsed.port)) {
      violations.push(`Suspicious port: ${parsed.port}`);
      targetRisk = 'medium';
    }
    
  } catch (error) {
    violations.push('Invalid URL format');
    targetRisk = 'high';
  }
  
  return {
    allowed: violations.length === 0,
    violations,
    targetRisk,
  };
}

function isPrivateIP(hostname: string): boolean {
  // Check for localhost
  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return true;
  }
  
  // Check for private IP ranges
  const privateRanges = [
    /^10\./,
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./,
    /^192\.168\./,
    /^169\.254\./,
    /^::1$/,
    /^fc00:/i,
    /^fe80:/i,
  ];
  
  return privateRanges.some(range => range.test(hostname));
}
```

---

## 7. DDoS Protection

### 7.1 Multi-Layer DDoS Mitigation

```typescript
// config/ddos-protection.ts

export const DDOS_CONFIG = {
  // Layer 1: Cloudflare (edge)
  cloudflare: {
    enabled: true,
    settings: {
      securityLevel: 'medium',
      challengeTTL: 1800,
      browserIntegrityCheck: true,
      hotlinkProtection: true,
      ipGeolocationFilter: true,
      rateLimiting: {
        threshold: 10000,
        period: 60,
        action: 'challenge',
      },
    },
  },
  
  // Layer 2: HAProxy (load balancer)
  haproxy: {
    enabled: true,
    settings: {
      maxConnections: 50000,
      connectionRateLimit: 100, // per second per IP
      stickTableSize: 100000,
      abusers: {
        blockThreshold: 500,  // requests per 10 seconds
        blockDuration: 600,   // 10 minutes
      },
    },
  },
  
  // Layer 3: Application level
  application: {
    enabled: true,
    settings: {
      maxRequestsPerSecond: 1000,
      maxBodySize: '10mb',
      slowlorisTimeout: 30000,
      keepAliveTimeout: 65000,
      requestTimeout: 30000,
    },
  },
};

// HAProxy configuration for DDoS protection
export const HAPROXY_DDOS_CONFIG = `
frontend http_front
    bind *:80
    bind *:443 ssl crt /etc/ssl/certs/scrapifie.pem
    
    # Connection rate limiting
    stick-table type ip size 100k expire 30s store http_req_rate(10s),conn_cur
    tcp-request connection track-sc0 src
    tcp-request connection reject if { sc0_conn_cur ge 100 }
    tcp-request connection reject if { sc0_http_req_rate ge 500 }
    
    # Tarpit suspicious requests
    http-request tarpit if { sc0_http_req_rate ge 200 }
    
    # Block known bad actors
    acl is_blocked src -f /etc/haproxy/blocked_ips.txt
    http-request deny if is_blocked
    
    # Rate limit by API key
    http-request set-header X-Forwarded-For %[src]
    
    default_backend api_backend

backend api_backend
    balance roundrobin
    option httpchk GET /health
    server api1 10.0.0.1:3000 check
    server api2 10.0.0.2:3000 check
    server api3 10.0.0.3:3000 check
`;
```

### 7.2 Adaptive Rate Limiting

```typescript
// services/adaptive-rate-limiter.ts

interface SystemLoad {
  cpu: number;
  memory: number;
  requestsPerSecond: number;
  errorRate: number;
  latencyP99: number;
}

export class AdaptiveRateLimiter {
  private redis: Redis;
  private baseRateLimits: Map<string, number> = new Map();
  private currentMultiplier: number = 1.0;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async adjustRateLimits(load: SystemLoad): Promise<void> {
    let multiplier = 1.0;
    
    // Reduce limits under high load
    if (load.cpu > 80) {
      multiplier *= 0.8;
    }
    if (load.memory > 85) {
      multiplier *= 0.9;
    }
    if (load.latencyP99 > 5000) {
      multiplier *= 0.7;
    }
    if (load.errorRate > 0.05) {
      multiplier *= 0.6;
    }
    
    // Don't reduce below 30% of normal
    multiplier = Math.max(0.3, multiplier);
    
    // Gradually adjust (don't change too quickly)
    const diff = multiplier - this.currentMultiplier;
    this.currentMultiplier += diff * 0.1;
    
    // Store multiplier in Redis for all instances
    await this.redis.set('scrx:ratelimit:multiplier', this.currentMultiplier.toString());
    
    // Alert if significantly reduced
    if (this.currentMultiplier < 0.7) {
      await this.redis.publish('scrx:alerts', JSON.stringify({
        type: 'rate_limit_reduced',
        multiplier: this.currentMultiplier,
        load,
      }));
    }
  }
  
  async getEffectiveRateLimit(baseLimit: number): Promise<number> {
    const multiplierStr = await this.redis.get('scrx:ratelimit:multiplier');
    const multiplier = parseFloat(multiplierStr || '1.0');
    return Math.floor(baseLimit * multiplier);
  }
}
```

### 7.3 IP Reputation and Blocking

```typescript
// services/ip-reputation.ts

interface IpReputation {
  ip: string;
  score: number;              // 0-100, lower is worse
  category: 'clean' | 'suspicious' | 'malicious';
  reasons: string[];
  lastUpdated: Date;
}

export class IpReputationService {
  private redis: Redis;
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async checkReputation(ip: string): Promise<IpReputation> {
    const cacheKey = `scrx:ip:reputation:${ip}`;
    
    // Check cache
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Calculate reputation
    const reasons: string[] = [];
    let score = 100;
    
    // Check local blocklist
    const isBlocked = await this.redis.sismember('scrx:ip:blocklist', ip);
    if (isBlocked) {
      score = 0;
      reasons.push('Blocklisted');
    }
    
    // Check auth failure history
    const authFailures = await this.redis.get(`scrx:auth:failures:${ip}`);
    if (authFailures) {
      const failures = parseInt(authFailures, 10);
      score -= Math.min(30, failures * 3);
      if (failures >= 5) reasons.push('Auth failures');
    }
    
    // Check rate limit violations
    const rateLimitViolations = await this.redis.get(`scrx:ratelimit:violations:${ip}`);
    if (rateLimitViolations) {
      const violations = parseInt(rateLimitViolations, 10);
      score -= Math.min(20, violations * 2);
      if (violations >= 3) reasons.push('Rate limit violations');
    }
    
    // Check for known datacenter/VPN IPs (optional)
    const isDatacenter = await this.checkDatacenterIP(ip);
    if (isDatacenter) {
      score -= 10;
      reasons.push('Datacenter IP');
    }
    
    // Determine category
    let category: 'clean' | 'suspicious' | 'malicious';
    if (score >= 70) {
      category = 'clean';
    } else if (score >= 40) {
      category = 'suspicious';
    } else {
      category = 'malicious';
    }
    
    const reputation: IpReputation = {
      ip,
      score: Math.max(0, score),
      category,
      reasons,
      lastUpdated: new Date(),
    };
    
    // Cache for 5 minutes
    await this.redis.set(cacheKey, JSON.stringify(reputation), 'EX', 300);
    
    return reputation;
  }
  
  async blockIP(ip: string, reason: string, durationSeconds: number): Promise<void> {
    const pipeline = this.redis.pipeline();
    
    pipeline.sadd('scrx:ip:blocklist', ip);
    if (durationSeconds > 0) {
      pipeline.expire('scrx:ip:blocklist', durationSeconds);
    }
    
    pipeline.hset(`scrx:ip:block:${ip}`, {
      reason,
      blockedAt: new Date().toISOString(),
      expiresAt: durationSeconds > 0 
        ? new Date(Date.now() + durationSeconds * 1000).toISOString() 
        : 'permanent',
    });
    
    await pipeline.exec();
    
    // Invalidate reputation cache
    await this.redis.del(`scrx:ip:reputation:${ip}`);
  }
  
  async unblockIP(ip: string): Promise<void> {
    await this.redis.srem('scrx:ip:blocklist', ip);
    await this.redis.del(`scrx:ip:block:${ip}`);
    await this.redis.del(`scrx:ip:reputation:${ip}`);
  }
  
  private async checkDatacenterIP(ip: string): Promise<boolean> {
    // Implementation would check against known datacenter IP ranges
    return false;
  }
}
```

---

## 8. Data Security

### 8.1 Encryption Configuration

```typescript
// config/encryption.ts

export const ENCRYPTION_CONFIG = {
  // Data at rest
  atRest: {
    algorithm: 'aes-256-gcm',
    keyDerivation: 'pbkdf2',
    keyDerivationIterations: 100000,
  },
  
  // Data in transit
  inTransit: {
    minTlsVersion: 'TLSv1.2',
    preferredTlsVersion: 'TLSv1.3',
    cipherSuites: [
      'TLS_AES_256_GCM_SHA384',
      'TLS_CHACHA20_POLY1305_SHA256',
      'TLS_AES_128_GCM_SHA256',
    ],
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true,
    },
  },
  
  // Sensitive fields that require encryption
  sensitiveFields: [
    'api_keys.key_hash',
    'users.password_hash',
    'users.mfa_secret',
    'proxy_providers.auth_credentials_encrypted',
  ],
  
  // Fields to mask in logs
  maskedFields: [
    'authorization',
    'x-api-key',
    'password',
    'secret',
    'token',
    'cookie',
  ],
};

// PostgreSQL encryption at rest
export const POSTGRES_ENCRYPTION = `
-- Enable pgcrypto extension
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Encrypt sensitive data
CREATE OR REPLACE FUNCTION encrypt_sensitive(data TEXT, key TEXT)
RETURNS BYTEA AS $$
BEGIN
  RETURN pgp_sym_encrypt(data, key);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrypt_sensitive(data BYTEA, key TEXT)
RETURNS TEXT AS $$
BEGIN
  RETURN pgp_sym_decrypt(data, key);
END;
$$ LANGUAGE plpgsql;
`;
```

### 8.2 Secret Management with Vault

```typescript
// services/vault.ts

import Vault from 'node-vault';

interface VaultConfig {
  endpoint: string;
  token: string;
  namespace?: string;
}

export class SecretManager {
  private vault: Vault.client;
  private cache: Map<string, { value: any; expiresAt: number }> = new Map();
  private cacheTTL = 300000; // 5 minutes
  
  constructor(config: VaultConfig) {
    this.vault = Vault({
      endpoint: config.endpoint,
      token: config.token,
      namespace: config.namespace,
    });
  }
  
  async getSecret(path: string): Promise<any> {
    // Check cache
    const cached = this.cache.get(path);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.value;
    }
    
    // Fetch from Vault
    const result = await this.vault.read(path);
    const value = result.data.data || result.data;
    
    // Cache the result
    this.cache.set(path, {
      value,
      expiresAt: Date.now() + this.cacheTTL,
    });
    
    return value;
  }
  
  async setSecret(path: string, data: Record<string, any>): Promise<void> {
    await this.vault.write(path, { data });
    this.cache.delete(path);
  }
  
  async deleteSecret(path: string): Promise<void> {
    await this.vault.delete(path);
    this.cache.delete(path);
  }
  
  // Rotate database credentials
  async rotateDatabaseCredentials(): Promise<{ username: string; password: string }> {
    const result = await this.vault.read('database/creds/scrapifie');
    return {
      username: result.data.username,
      password: result.data.password,
    };
  }
  
  // Generate dynamic API encryption key
  async getEncryptionKey(purpose: string): Promise<Buffer> {
    const result = await this.vault.write('transit/datakey/plaintext', {
      name: 'scrapifie-encryption',
      context: Buffer.from(purpose).toString('base64'),
    });
    
    return Buffer.from(result.data.plaintext, 'base64');
  }
}
```

### 8.3 Data Masking and Sanitization

```typescript
// services/data-sanitizer.ts

const SENSITIVE_PATTERNS = [
  // Credit card numbers
  /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/g,
  // SSN
  /\b\d{3}-\d{2}-\d{4}\b/g,
  // Email addresses
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
  // API keys (our format)
  /\bscrx_(live|test)_[a-zA-Z0-9]{32}\b/g,
  // Generic secrets
  /\b(password|secret|token|api[_-]?key)\s*[:=]\s*['"]?[^\s'"]+['"]?/gi,
];

export function sanitizeForLogging(data: any): any {
  if (typeof data === 'string') {
    let sanitized = data;
    for (const pattern of SENSITIVE_PATTERNS) {
      sanitized = sanitized.replace(pattern, '[REDACTED]');
    }
    return sanitized;
  }
  
  if (Array.isArray(data)) {
    return data.map(item => sanitizeForLogging(item));
  }
  
  if (typeof data === 'object' && data !== null) {
    const sanitized: Record<string, any> = {};
    
    for (const [key, value] of Object.entries(data)) {
      const lowerKey = key.toLowerCase();
      
      // Mask sensitive field names
      if (ENCRYPTION_CONFIG.maskedFields.some(f => lowerKey.includes(f))) {
        sanitized[key] = '[REDACTED]';
      } else {
        sanitized[key] = sanitizeForLogging(value);
      }
    }
    
    return sanitized;
  }
  
  return data;
}

// Sanitize scraped content before storage
export function sanitizeScrapedContent(content: string): string {
  let sanitized = content;
  
  // Remove potential PII
  for (const pattern of SENSITIVE_PATTERNS.slice(0, 3)) {
    sanitized = sanitized.replace(pattern, '[PII_REDACTED]');
  }
  
  return sanitized;
}
```

---

## 9. Infrastructure Security

### 9.1 Network Security

```yaml
# docker-compose.security.yml

version: '3.8'

networks:
  public:
    driver: overlay
    # Only load balancer exposed
  internal:
    driver: overlay
    internal: true
    # API servers, workers
  database:
    driver: overlay
    internal: true
    # PostgreSQL, Redis, MinIO

services:
  # Firewall rules via iptables
  firewall:
    image: scrapifie/firewall:latest
    cap_add:
      - NET_ADMIN
    network_mode: host
    volumes:
      - ./firewall-rules.sh:/firewall-rules.sh:ro
    command: /firewall-rules.sh
```

```bash
#!/bin/bash
# firewall-rules.sh

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow SSH from management IPs only
iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/8 -j ACCEPT

# Allow HTTP/HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow internal Docker networks
iptables -A INPUT -s 172.16.0.0/12 -j ACCEPT

# Rate limit new connections
iptables -A INPUT -p tcp --syn -m limit --limit 10/s --limit-burst 20 -j ACCEPT
iptables -A INPUT -p tcp --syn -j DROP

# Log dropped packets
iptables -A INPUT -j LOG --log-prefix "DROPPED: " --log-level 4
```

### 9.2 Container Security

```dockerfile
# Dockerfile.secure

FROM node:20-alpine AS base

# Security updates
RUN apk update && apk upgrade --no-cache

# Create non-root user
RUN addgroup -g 1001 scrapifie && \
    adduser -D -u 1001 -G scrapifie scrapifie

# Set working directory
WORKDIR /app

# Copy with correct ownership
COPY --chown=scrapifie:scrapifie package*.json ./
COPY --chown=scrapifie:scrapifie dist ./dist

# Install production dependencies only
RUN npm ci --only=production && \
    npm cache clean --force

# Remove unnecessary files
RUN rm -rf /root/.npm /tmp/*

# Switch to non-root user
USER scrapifie

# Security labels
LABEL org.opencontainers.image.vendor="Scrapifie" \
      org.opencontainers.image.title="Scrapifie API" \
      security.privileged="false" \
      security.capabilities="drop-all"

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3000/health || exit 1

# Run
CMD ["node", "dist/server.js"]
```

### 9.3 Security Scanning

```yaml
# .github/workflows/security-scan.yml

name: Security Scan

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]
  schedule:
    - cron: '0 0 * * *'  # Daily

jobs:
  dependency-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Snyk
        uses: snyk/actions/node@master
        env:
          SNYK_TOKEN: ${{ secrets.SNYK_TOKEN }}
        with:
          args: --severity-threshold=high
      
      - name: Run npm audit
        run: npm audit --production --audit-level=high

  container-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Build image
        run: docker build -t scrapifie/api:scan .
      
      - name: Run Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: 'scrapifie/api:scan'
          format: 'sarif'
          output: 'trivy-results.sarif'
          severity: 'CRITICAL,HIGH'
      
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'

  secret-scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      
      - name: TruffleHog Scan
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: ${{ github.event.repository.default_branch }}
          extra_args: --only-verified

  sast:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Run Semgrep
        uses: returntocorp/semgrep-action@v1
        with:
          config: p/security-audit
```

---

## 10. Audit Logging and Compliance

### 10.1 Comprehensive Audit Logging

```typescript
// services/audit-logger.ts

interface AuditEvent {
  id: string;
  timestamp: Date;
  eventType: string;
  category: 'auth' | 'access' | 'data' | 'admin' | 'security';
  severity: 'info' | 'warning' | 'critical';
  
  // Actor
  actorType: 'user' | 'api_key' | 'system' | 'anonymous';
  actorId?: string;
  actorIp?: string;
  actorUserAgent?: string;
  
  // Target
  targetType?: string;
  targetId?: string;
  organizationId?: string;
  
  // Details
  action: string;
  outcome: 'success' | 'failure' | 'error';
  details: Record<string, any>;
  
  // Request context
  requestId?: string;
  requestPath?: string;
  requestMethod?: string;
}

export class AuditLogger {
  private db: Pool;
  private redis: Redis;
  
  constructor(db: Pool, redis: Redis) {
    this.db = db;
    this.redis = redis;
  }
  
  async log(event: Omit<AuditEvent, 'id' | 'timestamp'>): Promise<void> {
    const auditEvent: AuditEvent = {
      ...event,
      id: randomUUID(),
      timestamp: new Date(),
    };
    
    // Write to database
    await this.db.query(`
      INSERT INTO audit_logs (
        id, timestamp, event_type, category, severity,
        actor_type, actor_id, actor_ip, actor_user_agent,
        target_type, target_id, organization_id,
        action, outcome, details,
        request_id, request_path, request_method
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
    `, [
      auditEvent.id,
      auditEvent.timestamp,
      auditEvent.eventType,
      auditEvent.category,
      auditEvent.severity,
      auditEvent.actorType,
      auditEvent.actorId,
      auditEvent.actorIp,
      auditEvent.actorUserAgent,
      auditEvent.targetType,
      auditEvent.targetId,
      auditEvent.organizationId,
      auditEvent.action,
      auditEvent.outcome,
      JSON.stringify(auditEvent.details),
      auditEvent.requestId,
      auditEvent.requestPath,
      auditEvent.requestMethod,
    ]);
    
    // Publish for real-time monitoring
    await this.redis.publish('scrx:audit', JSON.stringify(auditEvent));
    
    // Alert on critical events
    if (auditEvent.severity === 'critical') {
      await this.alertOnCritical(auditEvent);
    }
  }
  
  private async alertOnCritical(event: AuditEvent): Promise<void> {
    await this.redis.lpush('scrx:alerts:critical', JSON.stringify({
      source: 'audit',
      event,
      alertedAt: new Date().toISOString(),
    }));
  }
  
  // Convenience methods
  async logAuth(
    success: boolean,
    actorIp: string,
    details: Record<string, any>,
  ): Promise<void> {
    await this.log({
      eventType: success ? 'auth.success' : 'auth.failure',
      category: 'auth',
      severity: success ? 'info' : 'warning',
      actorType: 'anonymous',
      actorIp,
      action: 'authenticate',
      outcome: success ? 'success' : 'failure',
      details,
    });
  }
  
  async logApiKeyAction(
    action: 'create' | 'rotate' | 'revoke',
    userId: string,
    keyId: string,
    orgId: string,
  ): Promise<void> {
    await this.log({
      eventType: `api_key.${action}`,
      category: 'admin',
      severity: action === 'revoke' ? 'warning' : 'info',
      actorType: 'user',
      actorId: userId,
      targetType: 'api_key',
      targetId: keyId,
      organizationId: orgId,
      action: `api_key_${action}`,
      outcome: 'success',
      details: {},
    });
  }
  
  async logDataAccess(
    userId: string,
    resourceType: string,
    resourceId: string,
    action: string,
  ): Promise<void> {
    await this.log({
      eventType: `data.${action}`,
      category: 'data',
      severity: 'info',
      actorType: 'user',
      actorId: userId,
      targetType: resourceType,
      targetId: resourceId,
      action,
      outcome: 'success',
      details: {},
    });
  }
}
```

### 10.2 Audit Log Table Schema

```sql
-- Audit logs table (partitioned by month)
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY,
    timestamp TIMESTAMPTZ NOT NULL,
    
    -- Event classification
    event_type VARCHAR(100) NOT NULL,
    category VARCHAR(20) NOT NULL,
    severity VARCHAR(20) NOT NULL,
    
    -- Actor information
    actor_type VARCHAR(20) NOT NULL,
    actor_id UUID,
    actor_ip INET,
    actor_user_agent TEXT,
    
    -- Target information
    target_type VARCHAR(50),
    target_id UUID,
    organization_id UUID,
    
    -- Action details
    action VARCHAR(100) NOT NULL,
    outcome VARCHAR(20) NOT NULL,
    details JSONB DEFAULT '{}',
    
    -- Request context
    request_id UUID,
    request_path TEXT,
    request_method VARCHAR(10),
    
    -- Constraints
    CONSTRAINT valid_category CHECK (category IN ('auth', 'access', 'data', 'admin', 'security')),
    CONSTRAINT valid_severity CHECK (severity IN ('info', 'warning', 'critical')),
    CONSTRAINT valid_outcome CHECK (outcome IN ('success', 'failure', 'error'))
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2025_01 PARTITION OF audit_logs
    FOR VALUES FROM ('2025-01-01') TO ('2025-02-01');

-- Indexes for common queries
CREATE INDEX idx_audit_org_time ON audit_logs(organization_id, timestamp DESC);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id, timestamp DESC) WHERE actor_id IS NOT NULL;
CREATE INDEX idx_audit_event_type ON audit_logs(event_type, timestamp DESC);
CREATE INDEX idx_audit_severity ON audit_logs(severity, timestamp DESC) WHERE severity != 'info';

-- BRIN index for time-series access
CREATE INDEX idx_audit_time_brin ON audit_logs USING BRIN (timestamp);

-- Retention policy (keep 7 years for compliance)
-- Archive to S3 after 90 days, delete after 7 years
```

### 10.3 Compliance Reports

```typescript
// services/compliance-reports.ts

interface ComplianceReport {
  reportId: string;
  organizationId: string;
  reportType: 'access' | 'activity' | 'security';
  period: { start: Date; end: Date };
  generatedAt: Date;
  data: any;
}

export class ComplianceReporter {
  private db: Pool;
  
  constructor(db: Pool) {
    this.db = db;
  }
  
  async generateAccessReport(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    // Who accessed what and when
    const accessLog = await this.db.query(`
      SELECT 
        DATE_TRUNC('day', timestamp) as date,
        actor_type,
        actor_id,
        target_type,
        COUNT(*) as access_count,
        COUNT(DISTINCT target_id) as unique_resources
      FROM audit_logs
      WHERE organization_id = $1
        AND timestamp BETWEEN $2 AND $3
        AND category IN ('access', 'data')
      GROUP BY DATE_TRUNC('day', timestamp), actor_type, actor_id, target_type
      ORDER BY date DESC
    `, [orgId, startDate, endDate]);
    
    return {
      reportId: randomUUID(),
      organizationId: orgId,
      reportType: 'access',
      period: { start: startDate, end: endDate },
      generatedAt: new Date(),
      data: {
        accessPatterns: accessLog.rows,
        summary: this.summarizeAccessLog(accessLog.rows),
      },
    };
  }
  
  async generateSecurityReport(
    orgId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<ComplianceReport> {
    // Security events and anomalies
    const securityEvents = await this.db.query(`
      SELECT 
        event_type,
        severity,
        outcome,
        COUNT(*) as count,
        array_agg(DISTINCT actor_ip) as source_ips
      FROM audit_logs
      WHERE organization_id = $1
        AND timestamp BETWEEN $2 AND $3
        AND (category = 'security' OR severity IN ('warning', 'critical'))
      GROUP BY event_type, severity, outcome
      ORDER BY 
        CASE severity WHEN 'critical' THEN 1 WHEN 'warning' THEN 2 ELSE 3 END,
        count DESC
    `, [orgId, startDate, endDate]);
    
    return {
      reportId: randomUUID(),
      organizationId: orgId,
      reportType: 'security',
      period: { start: startDate, end: endDate },
      generatedAt: new Date(),
      data: {
        securityEvents: securityEvents.rows,
        riskAssessment: this.assessSecurityRisk(securityEvents.rows),
      },
    };
  }
  
  private summarizeAccessLog(rows: any[]): any {
    return {
      totalAccesses: rows.reduce((sum, r) => sum + parseInt(r.access_count), 0),
      uniqueActors: new Set(rows.map(r => r.actor_id)).size,
      resourceTypes: [...new Set(rows.map(r => r.target_type))],
    };
  }
  
  private assessSecurityRisk(events: any[]): any {
    const criticalCount = events.filter(e => e.severity === 'critical').length;
    const warningCount = events.filter(e => e.severity === 'warning').length;
    const failedAuth = events.filter(e => e.event_type.includes('auth.failure')).length;
    
    let riskLevel: 'low' | 'medium' | 'high' | 'critical';
    if (criticalCount > 0) {
      riskLevel = 'critical';
    } else if (warningCount > 10 || failedAuth > 50) {
      riskLevel = 'high';
    } else if (warningCount > 0 || failedAuth > 10) {
      riskLevel = 'medium';
    } else {
      riskLevel = 'low';
    }
    
    return {
      riskLevel,
      criticalEvents: criticalCount,
      warningEvents: warningCount,
      failedAuthentications: failedAuth,
    };
  }
}
```

---

## 11. Incident Response

### 11.1 Incident Response Procedures

```markdown
# Security Incident Response Playbook

## Severity Levels

| Level | Description | Response Time | Escalation |
|-------|-------------|---------------|------------|
| P1 - Critical | Data breach, full service outage | 15 minutes | CEO, Legal |
| P2 - High | Partial outage, security vulnerability | 1 hour | CTO, Security Lead |
| P3 - Medium | Degraded performance, minor security | 4 hours | On-call engineer |
| P4 - Low | Cosmetic issues, documentation | 24 hours | Engineering team |

## Incident Response Steps

### 1. Detection and Alerting

Automated alerts trigger for:
- Multiple failed authentication attempts (>10/minute per IP)
- Rate limit violations (>100% of limit)
- Error rate spike (>5% of requests)
- Unusual API key activity
- Database connection failures

### 2. Initial Assessment (0-15 minutes)

1. Acknowledge the incident in PagerDuty
2. Determine severity level
3. Create incident channel in Slack (#incident-YYYY-MM-DD-N)
4. Notify stakeholders based on severity

### 3. Containment (15-60 minutes)

For security breaches:
- Revoke compromised API keys
- Block malicious IPs
- Enable enhanced logging
- Preserve evidence (don't delete logs)

For service issues:
- Enable circuit breakers
- Scale down affected services
- Route traffic to healthy instances

### 4. Eradication (1-4 hours)

- Identify root cause
- Patch vulnerabilities
- Remove malicious artifacts
- Verify clean state

### 5. Recovery (4-24 hours)

- Gradually restore services
- Monitor for recurrence
- Validate data integrity
- Communicate status to customers

### 6. Post-Incident (24-72 hours)

- Complete incident report
- Conduct blameless postmortem
- Update runbooks
- Implement preventive measures
```

### 11.2 Automated Incident Detection

```typescript
// services/incident-detector.ts

interface IncidentSignal {
  type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  source: string;
  details: Record<string, any>;
  timestamp: Date;
}

interface Incident {
  id: string;
  severity: 'P1' | 'P2' | 'P3' | 'P4';
  status: 'detected' | 'acknowledged' | 'investigating' | 'resolved';
  signals: IncidentSignal[];
  createdAt: Date;
  acknowledgedAt?: Date;
  resolvedAt?: Date;
}

export class IncidentDetector {
  private redis: Redis;
  private alertThresholds = {
    authFailures: { window: 60, threshold: 10 },
    errorRate: { window: 300, threshold: 0.05 },
    rateLimitViolations: { window: 60, threshold: 100 },
    latencyP99: { window: 300, threshold: 10000 },
  };
  
  constructor(redis: Redis) {
    this.redis = redis;
  }
  
  async checkForIncidents(): Promise<Incident[]> {
    const incidents: Incident[] = [];
    
    // Check auth failure rate
    const authFailures = await this.getMetric('auth_failures', 60);
    if (authFailures > this.alertThresholds.authFailures.threshold) {
      incidents.push(this.createIncident('P2', [{
        type: 'auth_failure_spike',
        severity: 'high',
        source: 'auth',
        details: { count: authFailures, threshold: this.alertThresholds.authFailures.threshold },
        timestamp: new Date(),
      }]));
    }
    
    // Check error rate
    const errorRate = await this.getErrorRate(300);
    if (errorRate > this.alertThresholds.errorRate.threshold) {
      const severity = errorRate > 0.2 ? 'P1' : 'P2';
      incidents.push(this.createIncident(severity, [{
        type: 'error_rate_spike',
        severity: errorRate > 0.2 ? 'critical' : 'high',
        source: 'api',
        details: { errorRate, threshold: this.alertThresholds.errorRate.threshold },
        timestamp: new Date(),
      }]));
    }
    
    // Check latency
    const latencyP99 = await this.getLatencyP99(300);
    if (latencyP99 > this.alertThresholds.latencyP99.threshold) {
      incidents.push(this.createIncident('P3', [{
        type: 'latency_spike',
        severity: 'medium',
        source: 'performance',
        details: { latencyP99, threshold: this.alertThresholds.latencyP99.threshold },
        timestamp: new Date(),
      }]));
    }
    
    return incidents;
  }
  
  private createIncident(severity: 'P1' | 'P2' | 'P3' | 'P4', signals: IncidentSignal[]): Incident {
    return {
      id: randomUUID(),
      severity,
      status: 'detected',
      signals,
      createdAt: new Date(),
    };
  }
  
  async alertOnIncident(incident: Incident): Promise<void> {
    // Store incident
    await this.redis.hset(`scrx:incident:${incident.id}`, {
      data: JSON.stringify(incident),
      status: incident.status,
    });
    
    // Publish for real-time notification
    await this.redis.publish('scrx:incidents', JSON.stringify(incident));
    
    // Send to PagerDuty for P1/P2
    if (incident.severity === 'P1' || incident.severity === 'P2') {
      await this.sendToPagerDuty(incident);
    }
    
    // Send to Slack
    await this.sendToSlack(incident);
  }
  
  private async getMetric(name: string, windowSeconds: number): Promise<number> {
    const key = `scrx:metrics:${name}`;
    const count = await this.redis.zcount(key, Date.now() - windowSeconds * 1000, '+inf');
    return count;
  }
  
  private async getErrorRate(windowSeconds: number): Promise<number> {
    const errors = await this.getMetric('errors', windowSeconds);
    const total = await this.getMetric('requests', windowSeconds);
    return total > 0 ? errors / total : 0;
  }
  
  private async getLatencyP99(windowSeconds: number): Promise<number> {
    // Implementation would calculate P99 from stored latency values
    return 100;
  }
  
  private async sendToPagerDuty(incident: Incident): Promise<void> {
    // PagerDuty API integration
  }
  
  private async sendToSlack(incident: Incident): Promise<void> {
    // Slack webhook integration
  }
}
```

---

## 12. Appendix

### 12.1 Security Checklist

| Category | Item | Status |
|----------|------|--------|
| **Authentication** | | |
| | API key generation with secure random | Required |
| | Key hashing with SHA-256 | Required |
| | Key rotation support | Required |
| | Failed attempt limiting | Required |
| **Authorization** | | |
| | RBAC implementation | Required |
| | Scope-based API access | Required |
| | IP allowlisting | Optional |
| **Rate Limiting** | | |
| | Per-key rate limiting | Required |
| | Per-IP rate limiting | Required |
| | Concurrent job limiting | Required |
| | Adaptive rate limiting | Recommended |
| **Data Security** | | |
| | TLS 1.2+ enforced | Required |
| | Encryption at rest | Required |
| | Sensitive data masking | Required |
| | PII detection and handling | Required |
| **Infrastructure** | | |
| | Container security hardening | Required |
| | Network segmentation | Required |
| | Regular security scanning | Required |
| | Secrets management (Vault) | Required |
| **Monitoring** | | |
| | Audit logging | Required |
| | Real-time alerting | Required |
| | Anomaly detection | Recommended |
| | Incident response automation | Recommended |

### 12.2 Security Headers Configuration

```typescript
// middleware/security-headers.ts

export const SECURITY_HEADERS = {
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'",
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Permissions-Policy': 'geolocation=(), microphone=(), camera=()',
  'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};
```

### 12.3 Security Contacts

| Role | Contact | Escalation |
|------|---------|------------|
| Security Lead | security@scrapifie.io | Primary |
| On-Call Engineer | oncall@scrapifie.io | 24/7 PagerDuty |
| CTO | cto@scrapifie.io | P1 incidents |
| Legal | legal@scrapifie.io | Data breaches |

---

## Document Control

### Revision History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2025-01-31 | Security Team | Initial release |

### Approval

| Role | Name | Date | Signature |
|------|------|------|-----------|
| Security Lead | | | |
| CTO | | | |
| Compliance Officer | | | |

### Distribution

This document is classified as **Internal - Confidential** and is approved for distribution to the Scrapifie security, engineering, and operations teams only.
