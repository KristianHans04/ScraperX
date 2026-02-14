import { FastifyRequest, FastifyReply } from 'fastify';
import { apiKeyRepository, accountRepository } from '../../db/index.js';
import { hashApiKey } from '../../utils/crypto.js';
import {
  MissingApiKeyError,
  InvalidApiKeyError,
  ExpiredApiKeyError,
  RevokedApiKeyError,
  IpNotAllowedError,
  AccountSuspendedError,
} from '../../utils/errors.js';
import { logger } from '../../utils/logger.js';
import type { ApiKey, Account } from '../../types/index.js';

// Extend FastifyRequest to include auth context
declare module 'fastify' {
  interface FastifyRequest {
    apiKey?: ApiKey;
    account?: Account;
    clientIp?: string;
  }
}

/**
 * Extract API key from request
 */
function extractApiKey(request: FastifyRequest): string | null {
  // Check Authorization header (Bearer token)
  const authHeader = request.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }
    // Also support just the API key
    if (authHeader.startsWith('sk_')) {
      return authHeader;
    }
  }

  // Check X-API-Key header
  const apiKeyHeader = request.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') {
    return apiKeyHeader;
  }

  // Check query parameter (not recommended but supported)
  const queryApiKey = (request.query as Record<string, string>)?.api_key;
  if (queryApiKey) {
    return queryApiKey;
  }

  return null;
}

/**
 * Extract client IP from request
 */
function extractClientIp(request: FastifyRequest): string {
  // Check X-Forwarded-For header (when behind proxy)
  const forwardedFor = request.headers['x-forwarded-for'];
  if (forwardedFor) {
    const ips = Array.isArray(forwardedFor) 
      ? forwardedFor[0] 
      : forwardedFor.split(',')[0];
    return ips.trim();
  }

  // Check X-Real-IP header
  const realIp = request.headers['x-real-ip'];
  if (typeof realIp === 'string') {
    return realIp;
  }

  // Fall back to direct connection IP
  return request.ip;
}

/**
 * Check if IP is in allowed list
 */
function isIpAllowed(clientIp: string, allowedIps: string[]): boolean {
  if (allowedIps.length === 0) {
    return true; // No restrictions
  }

  // Simple exact match - could be extended for CIDR support
  return allowedIps.some(allowed => {
    // Handle CIDR notation (basic support)
    if (allowed.includes('/')) {
      return matchCidr(clientIp, allowed);
    }
    return clientIp === allowed;
  });
}

/**
 * Basic CIDR matching
 */
function matchCidr(ip: string, cidr: string): boolean {
  const [range, bits] = cidr.split('/');
  const mask = parseInt(bits, 10);
  
  if (isNaN(mask) || mask < 0 || mask > 32) {
    return false;
  }

  const ipParts = ip.split('.').map(Number);
  const rangeParts = range.split('.').map(Number);

  if (ipParts.length !== 4 || rangeParts.length !== 4) {
    return false;
  }

  const ipNum = ipParts.reduce((acc, part) => (acc << 8) + part, 0);
  const rangeNum = rangeParts.reduce((acc, part) => (acc << 8) + part, 0);
  const maskNum = mask === 0 ? 0 : (~0 << (32 - mask)) >>> 0;

  return (ipNum & maskNum) === (rangeNum & maskNum);
}

/**
 * Authentication middleware
 */
export async function authMiddleware(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const startTime = Date.now();

  try {
    // Extract client IP first
    const clientIp = extractClientIp(request);
    request.clientIp = clientIp;

    // Extract API key
    const rawApiKey = extractApiKey(request);
    if (!rawApiKey) {
      throw new MissingApiKeyError();
    }

    // Hash the API key for lookup
    const keyHash = hashApiKey(rawApiKey);

    // Find the API key
    const apiKey = await apiKeyRepository.findByHash(keyHash);
    if (!apiKey) {
      logger.warn({ keyPrefix: rawApiKey.slice(0, 12) }, 'Invalid API key attempt');
      throw new InvalidApiKeyError();
    }

    // Check if key is active
    if (!apiKey.isActive) {
      throw new RevokedApiKeyError();
    }

    // Check if key is revoked
    if (apiKey.revokedAt) {
      throw new RevokedApiKeyError();
    }

    // Check if key is expired
    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      throw new ExpiredApiKeyError();
    }

    // Check IP restrictions
    if (apiKey.allowedIps && apiKey.allowedIps.length > 0) {
      if (!isIpAllowed(clientIp, apiKey.allowedIps)) {
        logger.warn(
          { apiKeyId: apiKey.id, clientIp, allowedIps: apiKey.allowedIps },
          'Request from non-whitelisted IP'
        );
        throw new IpNotAllowedError();
      }
    }

    // Get the account
    const account = await accountRepository.findById(apiKey.accountId);
    if (!account) {
      logger.error({ apiKeyId: apiKey.id, accountId: apiKey.accountId }, 'Account not found for API key');
      throw new InvalidApiKeyError('Account not found');
    }

    // Check account status
    if (account.deletedAt) {
      throw new AccountSuspendedError('Account has been deleted');
    }

    if (account.status === 'suspended') {
      throw new AccountSuspendedError('Account is suspended');
    }

    if (account.status === 'restricted') {
      throw new AccountSuspendedError('Account is restricted');
    }

    // Update last used (fire and forget)
    apiKeyRepository.updateLastUsed(apiKey.id, {
      ip: clientIp,
      userAgent: request.headers['user-agent'],
    }).catch(err => {
      logger.error({ err, apiKeyId: apiKey.id }, 'Failed to update API key last used');
    });

    // Attach to request
    request.apiKey = apiKey;
    request.account = account;

    const authTime = Date.now() - startTime;
    logger.debug(
      { 
        apiKeyId: apiKey.id, 
        accountId: account.id, 
        authTimeMs: authTime 
      },
      'Request authenticated'
    );

  } catch (error) {
    if (error instanceof MissingApiKeyError ||
        error instanceof InvalidApiKeyError ||
        error instanceof ExpiredApiKeyError ||
        error instanceof RevokedApiKeyError ||
        error instanceof IpNotAllowedError ||
        error instanceof AccountSuspendedError) {
      return reply.status(error.statusCode).send({
        success: false,
        error: {
          code: error.code,
          message: error.message,
          retryable: error.retryable,
        },
      });
    }
    throw error;
  }
}

/**
 * Optional auth middleware - authenticates if key present, continues otherwise
 */
export async function optionalAuthMiddleware(
  request: FastifyRequest,
  _reply: FastifyReply
): Promise<void> {
  const rawApiKey = extractApiKey(request);
  if (!rawApiKey) {
    return; // Continue without auth
  }

  const keyHash = hashApiKey(rawApiKey);
  const apiKey = await apiKeyRepository.findActiveByHash(keyHash);
  
  if (apiKey) {
    const account = await accountRepository.findById(apiKey.accountId);
    if (account && !account.deletedAt) {
      request.apiKey = apiKey;
      request.account = account;
      request.clientIp = extractClientIp(request);
    }
  }
}

/**
 * Scope checking middleware factory
 */
export function requireScope(scope: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.apiKey) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    const hasScope = request.apiKey.scopes.includes(scope) || 
                     request.apiKey.scopes.includes('*');

    if (!hasScope) {
      return reply.status(403).send({
        success: false,
        error: {
          code: 'INSUFFICIENT_SCOPE',
          message: `This action requires the '${scope}' scope`,
          retryable: false,
        },
      });
    }
  };
}

/**
 * Feature flag checking middleware factory
 * Note: Features are part of Phase 10+ and not yet implemented in Account model
 */
export function requireFeature(feature: string) {
  return async (request: FastifyRequest, reply: FastifyReply): Promise<void> => {
    if (!request.account) {
      return reply.status(401).send({
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Authentication required',
          retryable: false,
        },
      });
    }

    // TODO: Implement feature flags in Account model (Phase 10+)
    // For now, all features are available
    return;
  };
}
