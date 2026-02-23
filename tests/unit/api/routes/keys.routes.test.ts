/**
 * Unit tests for API Keys Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import express from 'express';
import request from 'supertest';
import { createKeysRoutes } from '../../../../src/api/routes/keys.routes.js';
import { apiKeyRepository } from '../../../../src/db/repositories/apiKey.repository.js';
import { requireAuth } from '../../../../src/api/middleware/authExpress.js';

vi.mock('../../../../src/api/middleware/authExpress.js', () => ({
  requireAuth: vi.fn(),
}));

vi.mock('../../../../src/db/repositories/apiKey.repository.js', () => ({
  apiKeyRepository: {
    findByAccount: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    revoke: vi.fn(),
  },
}));

vi.mock('../../../../src/utils/logger.js', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

const mockUser = {
  id: 'user-123',
  accountId: 'account-123',
  email: 'test@example.com',
  role: 'user',
};

const mockApiKey = {
  id: 'key-1',
  accountId: 'account-123',
  createdByUserId: 'user-123',
  keyPrefix: 'sk_live_',
  keyHash: 'hashed-key',
  name: 'Test Key',
  scopes: ['scrape:read', 'scrape:write'],
  environment: 'production' as const,
  isActive: true,
  lastUsedAt: undefined,
  createdAt: new Date('2024-01-01T00:00:00Z'),
  updatedAt: new Date('2024-01-01T00:00:00Z'),
  expiresAt: undefined,
  usageCount: 0,
  metadata: {},
};

function buildApp() {
  const app = express();
  app.use(express.json());
  app.use('/api/keys', createKeysRoutes());
  return app;
}

describe('Keys Routes', () => {
  beforeEach(() => {
    vi.mocked(requireAuth).mockImplementation((req: any, _res, next) => {
      req.user = mockUser;
      next();
    });
  });

  describe('GET /api/keys', () => {
    it('should return list of API keys for the authenticated user', async () => {
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([mockApiKey]);

      const res = await request(buildApp()).get('/api/keys');

      expect(res.status).toBe(200);
      expect(res.body.keys).toHaveLength(1);
      expect(res.body.keys[0].id).toBe('key-1');
      expect(res.body.keys[0].name).toBe('Test Key');
      expect(res.body.keys[0].keyPrefix).toBe('sk_live_');
      expect(res.body.keys[0]).not.toHaveProperty('keyHash');
      expect(apiKeyRepository.findByAccount).toHaveBeenCalledWith('account-123');
    });

    it('should return empty array when no keys exist', async () => {
      vi.mocked(apiKeyRepository.findByAccount).mockResolvedValue([]);

      const res = await request(buildApp()).get('/api/keys');

      expect(res.status).toBe(200);
      expect(res.body.keys).toEqual([]);
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(requireAuth).mockImplementation((_req, res) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(buildApp()).get('/api/keys');

      expect(res.status).toBe(401);
    });

    it('should return 500 when repository throws', async () => {
      vi.mocked(apiKeyRepository.findByAccount).mockRejectedValue(new Error('DB error'));

      const res = await request(buildApp()).get('/api/keys');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to fetch API keys');
    });
  });

  describe('POST /api/keys', () => {
    it('should create a new API key and return 201', async () => {
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        rawKey: 'sk_live_secret_key_full',
        apiKey: {
          ...mockApiKey,
          id: 'key-new',
          name: 'My New Key',
        },
      });

      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'My New Key' });

      expect(res.status).toBe(201);
      expect(res.body.key).toBe('sk_live_secret_key_full');
      expect(res.body.apiKey.id).toBe('key-new');
      expect(res.body.apiKey.name).toBe('My New Key');
      expect(res.body.apiKey).not.toHaveProperty('keyHash');
      expect(apiKeyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'account-123',
        createdByUserId: 'user-123',
        name: 'My New Key',
      }));
    });

    it('should create key with custom environment and scopes', async () => {
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        rawKey: 'sk_dev_key',
        apiKey: { ...mockApiKey, environment: 'development' as const },
      });

      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'Dev Key', environment: 'development', scopes: ['scrape:read'] });

      expect(res.status).toBe(201);
      expect(apiKeyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        environment: 'development',
        scopes: ['scrape:read'],
      }));
    });

    it('should create key with expiration when expiresInDays is provided', async () => {
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        rawKey: 'sk_live_temp',
        apiKey: mockApiKey,
      });

      const before = Date.now();
      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'Temp Key', expiresInDays: 30 });
      const after = Date.now();

      expect(res.status).toBe(201);
      const callArg = vi.mocked(apiKeyRepository.create).mock.calls[0][0];
      expect(callArg.expiresAt).toBeInstanceOf(Date);
      const expiresMs = callArg.expiresAt!.getTime();
      expect(expiresMs).toBeGreaterThanOrEqual(before + 30 * 24 * 60 * 60 * 1000);
      expect(expiresMs).toBeLessThanOrEqual(after + 30 * 24 * 60 * 60 * 1000);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(buildApp())
        .post('/api/keys')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(requireAuth).mockImplementation((_req, res) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'My Key' });

      expect(res.status).toBe(401);
    });

    it('should return 500 when repository throws', async () => {
      vi.mocked(apiKeyRepository.create).mockRejectedValue(new Error('DB error'));

      const res = await request(buildApp())
        .post('/api/keys')
        .send({ name: 'My Key' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to create API key');
    });
  });

  describe('DELETE /api/keys/:id', () => {
    it('should revoke API key and return success', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(mockApiKey);
      vi.mocked(apiKeyRepository.revoke).mockResolvedValue(true);

      const res = await request(buildApp()).delete('/api/keys/key-1');

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(apiKeyRepository.revoke).toHaveBeenCalledWith('key-1');
    });

    it('should return 404 when key does not exist', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(null);

      const res = await request(buildApp()).delete('/api/keys/nonexistent');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API key not found');
    });

    it('should return 404 when key belongs to a different account', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        ...mockApiKey,
        accountId: 'other-account',
      });

      const res = await request(buildApp()).delete('/api/keys/key-1');

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API key not found');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(requireAuth).mockImplementation((_req, res) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(buildApp()).delete('/api/keys/key-1');

      expect(res.status).toBe(401);
    });

    it('should return 500 when repository throws', async () => {
      vi.mocked(apiKeyRepository.findById).mockRejectedValue(new Error('DB error'));

      const res = await request(buildApp()).delete('/api/keys/key-1');

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to revoke API key');
    });
  });

  describe('PATCH /api/keys/:id', () => {
    it('should update API key name and return success', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(mockApiKey);

      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'Updated Key Name' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });

    it('should return 400 when name is missing', async () => {
      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({});

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 400 when name is empty string', async () => {
      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: '' });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 400 when name exceeds 100 characters', async () => {
      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'a'.repeat(101) });

      expect(res.status).toBe(400);
      expect(res.body.error).toBe('Invalid API key name');
    });

    it('should return 404 when key does not exist', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(null);

      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API key not found');
    });

    it('should return 404 when key belongs to a different account', async () => {
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        ...mockApiKey,
        accountId: 'other-account',
      });

      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'New Name' });

      expect(res.status).toBe(404);
      expect(res.body.error).toBe('API key not found');
    });

    it('should return 401 when not authenticated', async () => {
      vi.mocked(requireAuth).mockImplementation((_req, res) => {
        res.status(401).json({ error: 'Authentication required' });
      });

      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'New Name' });

      expect(res.status).toBe(401);
    });

    it('should return 500 when repository throws', async () => {
      vi.mocked(apiKeyRepository.findById).mockRejectedValue(new Error('DB error'));

      const res = await request(buildApp())
        .patch('/api/keys/key-1')
        .send({ name: 'New Name' });

      expect(res.status).toBe(500);
      expect(res.body.error).toBe('Failed to update API key');
    });
  });
});
