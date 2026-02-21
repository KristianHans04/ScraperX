import { Request, Response, NextFunction } from 'express';
import { apiKeyRepository } from '../../db/repositories/apiKey.repository.js';
import { accountRepository } from '../../db/repositories/account.repository.js';
import { hashApiKey } from '../../utils/crypto.js';
import { logger } from '../../utils/logger.js';
import type { ApiKey, Account } from '../../types/index.js';

declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      apiKeyAccount?: Account;
    }
  }
}

function extractApiKey(req: Request): string | null {
  const authHeader = req.headers.authorization;
  if (authHeader) {
    if (authHeader.startsWith('Bearer ')) return authHeader.slice(7);
    if (authHeader.startsWith('sk_')) return authHeader;
  }
  const apiKeyHeader = req.headers['x-api-key'];
  if (typeof apiKeyHeader === 'string') return apiKeyHeader;
  if (typeof req.query?.api_key === 'string') return req.query.api_key;
  return null;
}

export async function requireApiKey(req: Request, res: Response, next: NextFunction): Promise<void> {
  const rawKey = extractApiKey(req);
  if (!rawKey) {
    res.status(401).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'API key is required' } });
    return;
  }

  try {
    const keyHash = hashApiKey(rawKey);
    const apiKey = await apiKeyRepository.findActiveByHash(keyHash);

    if (!apiKey) {
      res.status(401).json({ success: false, error: { code: 'INVALID_API_KEY', message: 'Invalid or revoked API key' } });
      return;
    }

    const account = await accountRepository.findById(apiKey.accountId);
    if (!account) {
      res.status(401).json({ success: false, error: { code: 'ACCOUNT_NOT_FOUND', message: 'Account not found' } });
      return;
    }

    if (account.status === 'suspended') {
      res.status(403).json({ success: false, error: { code: 'ACCOUNT_SUSPENDED', message: 'Account is suspended' } });
      return;
    }

    req.apiKey = apiKey;
    req.apiKeyAccount = account;
    next();
  } catch (error) {
    logger.error({ error }, 'API key authentication failed');
    res.status(500).json({ success: false, error: { code: 'AUTH_ERROR', message: 'Authentication error' } });
  }
}

export function requireScope(scope: string) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const apiKey = req.apiKey;
    if (!apiKey) {
      res.status(401).json({ success: false, error: { code: 'MISSING_API_KEY', message: 'API key required' } });
      return;
    }
    if (apiKey.scopes && !apiKey.scopes.includes(scope) && !apiKey.scopes.includes('*')) {
      res.status(403).json({ success: false, error: { code: 'INSUFFICIENT_SCOPE', message: `Required scope: ${scope}` } });
      return;
    }
    next();
  };
}
