import { Router, Request, Response } from 'express';
import { requireAuth } from '../middleware/authExpress.js';
import { apiKeyRepository } from '../../db/repositories/apiKey.repository.js';
import { logger } from '../../utils/logger.js';

const router = Router();

// GET /api/keys - List all API keys for the authenticated user
router.get('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const keys = await apiKeyRepository.findByAccount(accountId);

    const sanitizedKeys = keys.map(key => ({
      id: key.id,
      name: key.name,
      keyPrefix: key.keyPrefix,
      environment: key.environment,
      isActive: key.isActive,
      lastUsedAt: key.lastUsedAt,
      createdAt: key.createdAt,
      expiresAt: key.expiresAt,
      scopes: key.scopes,
    }));

    res.json({ keys: sanitizedKeys });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to list API keys');
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
});

// POST /api/keys - Create a new API key
router.post('/', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { name, environment = 'production', expiresInDays, scopes = ['scrape:read', 'scrape:write'] } = req.body;

    if (!name || name.trim().length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Invalid API key name' });
    }

    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : undefined;

    const result = await apiKeyRepository.create({
      accountId,
      createdByUserId: req.user!.id,
      name: name.trim(),
      scopes,
      environment,
      expiresAt,
    });

    logger.info({ accountId, keyId: result.apiKey.id, name }, 'API key created');

    res.status(201).json({
      key: result.rawKey, // Only shown once
      apiKey: {
        id: result.apiKey.id,
        name: result.apiKey.name,
        keyPrefix: result.apiKey.keyPrefix,
        environment: result.apiKey.environment,
        isActive: result.apiKey.isActive,
        createdAt: result.apiKey.createdAt,
        expiresAt: result.apiKey.expiresAt,
        scopes: result.apiKey.scopes,
      },
    });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id }, 'Failed to create API key');
    res.status(500).json({ error: 'Failed to create API key' });
  }
});

// DELETE /api/keys/:id - Revoke an API key
router.delete('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { id } = req.params;

    const apiKey = await apiKeyRepository.findById(id);
    if (!apiKey || apiKey.accountId !== accountId) {
      return res.status(404).json({ error: 'API key not found' });
    }

    await apiKeyRepository.revoke(id);

    logger.info({ accountId, keyId: id }, 'API key revoked');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id, keyId: req.params.id }, 'Failed to revoke API key');
    res.status(500).json({ error: 'Failed to revoke API key' });
  }
});

// PATCH /api/keys/:id - Update API key (name only)
router.patch('/:id', requireAuth, async (req: Request, res: Response) => {
  try {
    const accountId = req.user!.accountId;
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim().length < 1 || name.length > 100) {
      return res.status(400).json({ error: 'Invalid API key name' });
    }

    const apiKey = await apiKeyRepository.findById(id);
    if (!apiKey || apiKey.accountId !== accountId) {
      return res.status(404).json({ error: 'API key not found' });
    }


    logger.info({ accountId, keyId: id, newName: name }, 'API key updated');

    res.json({ success: true });
  } catch (error: any) {
    logger.error({ error, userId: req.user?.id, keyId: req.params.id }, 'Failed to update API key');
    res.status(500).json({ error: 'Failed to update API key' });
  }
});

export function createKeysRoutes() {
  return router;
}
