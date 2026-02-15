/**
 * Unit tests for API Keys Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { keysRoutes } from '@api/routes/keys.routes.js';
import { apiKeyRepository, sessionRepository, userRepository } from '../../../src/db/index.js';
import { generateApiKey } from '../../../src/utils/crypto.js';

// Mock the repositories and crypto
vi.mock('../../../src/db/index', () => ({
  apiKeyRepository: {
    findByAccountId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    revoke: vi.fn(),
  },
  sessionRepository: {
    get: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/utils/crypto', () => ({
  generateApiKey: vi.fn(),
}));

describe('Keys Routes', () => {
  let mockServer: any;
  let routeHandlers: Record<string, Function>;
  let routeSchemas: Record<string, any>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};
    routeSchemas = {};
    mockServer = {
      get: vi.fn((path: string, schemaOrHandler: any, handler?: Function) => {
        if (handler) {
          routeHandlers[path] = handler;
          routeSchemas[path] = schemaOrHandler;
        } else {
          routeHandlers[path] = schemaOrHandler;
        }
      }),
      post: vi.fn((path: string, schemaOrHandler: any, handler?: Function) => {
        if (handler) {
          routeHandlers[path] = handler;
          routeSchemas[path] = schemaOrHandler;
        } else {
          routeHandlers[path] = schemaOrHandler;
        }
      }),
      patch: vi.fn((path: string, schemaOrHandler: any, handler?: Function) => {
        if (handler) {
          routeHandlers[path] = handler;
          routeSchemas[path] = schemaOrHandler;
        } else {
          routeHandlers[path] = schemaOrHandler;
        }
      }),
      delete: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
    };
  });

  const createMockRequest = (
    cookies: Record<string, string> = {},
    body: Record<string, any> = {},
    params: Record<string, string> = {},
    query: Record<string, string> = {}
  ) => ({
    cookies,
    body,
    params,
    query,
  });

  const mockReply = () => ({
    code: vi.fn().mockReturnThis(),
  });

  const mockUser = {
    id: 'user-123',
    accountId: 'account-123',
    email: 'test@example.com',
  };

  describe('GET /api/keys', () => {
    beforeEach(async () => {
      await keysRoutes(mockServer as any);
    });

    it('should return paginated list of API keys', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([
        {
          id: 'key-1',
          name: 'Production Key',
          keyPreview: 'sk_live_...abcd',
          type: 'standard',
          status: 'active',
          lastUsedAt: '2024-03-15T10:00:00Z',
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
        },
        {
          id: 'key-2',
          name: 'Test Key',
          keyPreview: 'sk_live_...efgh',
          type: 'restricted',
          status: 'active',
          lastUsedAt: null,
          createdAt: '2024-02-01T00:00:00Z',
          expiresAt: '2024-12-31T00:00:00Z',
        },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/keys'](request);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 50,
        total: 2,
        totalPages: 1,
      });
      expect(result.data[0]).toHaveProperty('id');
      expect(result.data[0]).toHaveProperty('name');
      expect(result.data[0]).toHaveProperty('keyPreview');
      expect(result.data[0]).not.toHaveProperty('keyHash');
    });

    it('should paginate results correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue(
        Array(100).fill(null).map((_, i) => ({
          id: `key-${i}`,
          name: `Key ${i}`,
          keyPreview: `sk_live_...${i}`,
          type: 'standard',
          status: 'active',
          lastUsedAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
        }))
      );

      const request = createMockRequest({ sessionId: 'valid-session' }, {}, {}, { page: '2', limit: '10' });
      const result = await routeHandlers['/api/keys'](request);

      expect(result.data).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(result.pagination.total).toBe(100);
      expect(result.pagination.totalPages).toBe(10);
    });

    it('should return empty array when no keys exist', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/keys'](request);

      expect(result.data).toEqual([]);
      expect(result.pagination.total).toBe(0);
      expect(result.pagination.totalPages).toBe(0);
    });

    it('should use default pagination values', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      await routeHandlers['/api/keys'](request);

      expect(apiKeyRepository.findByAccountId).toHaveBeenCalledWith('account-123');
    });

    it('should throw UnauthorizedError when not authenticated', async () => {
      const request = createMockRequest({});

      await expect(routeHandlers['/api/keys'](request)).rejects.toThrow('Not authenticated');
    });
  });

  describe('POST /api/keys', () => {
    beforeEach(async () => {
      await keysRoutes(mockServer as any);
    });

    it('should create a new API key', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(generateApiKey).mockReturnValue({
        key: 'sk_live_1234567890abcdef',
        hash: 'hashed_key_value',
      });
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        id: 'key-new',
        accountId: 'account-123',
        name: 'My New Key',
        keyHash: 'hashed_key_value',
        keyPreview: 'sk_live_...cdef',
        type: 'standard',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2024-03-15T10:00:00Z',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'My New Key' }
      );
      const result = await routeHandlers['/api/keys'](request);

      expect(result.key).toBe('sk_live_1234567890abcdef');
      expect(result.apiKey).toBeDefined();
      expect(result.apiKey.name).toBe('My New Key');
      expect(apiKeyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'account-123',
        name: 'My New Key',
        keyHash: 'hashed_key_value',
        type: 'standard',
        status: 'active',
      }));
    });

    it('should create key with custom type', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(generateApiKey).mockReturnValue({
        key: 'sk_live_test',
        hash: 'hashed',
      });
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'Restricted Key',
        keyHash: 'hashed',
        keyPreview: 'sk_live_test',
        type: 'restricted',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2024-03-15T10:00:00Z',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'Restricted Key', type: 'restricted' }
      );
      await routeHandlers['/api/keys'](request);

      expect(apiKeyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        type: 'restricted',
      }));
    });

    it('should create key with expiration date', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(generateApiKey).mockReturnValue({
        key: 'sk_live_test',
        hash: 'hashed',
      });
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'Temporary Key',
        keyHash: 'hashed',
        keyPreview: 'sk_live_test',
        type: 'standard',
        status: 'active',
        expiresAt: '2024-12-31T00:00:00Z',
        lastUsedAt: null,
        createdAt: '2024-03-15T10:00:00Z',
      });

      const expiresAt = '2024-12-31T00:00:00Z';
      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'Temporary Key', expiresAt }
      );
      await routeHandlers['/api/keys'](request);

      expect(apiKeyRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        expiresAt,
      }));
    });

    it('should validate required name field', async () => {
      expect(routeSchemas['/api/keys']).toBeDefined();
      expect(routeSchemas['/api/keys'].schema.body.required).toContain('name');
      expect(routeSchemas['/api/keys'].schema.body.properties.name.minLength).toBe(1);
    });

    it('should validate type enum', async () => {
      expect(routeSchemas['/api/keys'].schema.body.properties.type.enum).toEqual(['standard', 'restricted']);
    });

    it('should generate key preview correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(generateApiKey).mockReturnValue({
        key: 'sk_live_1234567890abcdefghij',
        hash: 'hashed',
      });
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'Test',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...hij',
        type: 'standard',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2024-03-15T10:00:00Z',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'Test' }
      );
      const result = await routeHandlers['/api/keys'](request);

      expect(result.apiKey.keyPreview).toBe('sk_live_...hij');
    });

    it('should only return full key once on creation', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(generateApiKey).mockReturnValue({
        key: 'sk_live_secret_key',
        hash: 'hashed',
      });
      vi.mocked(apiKeyRepository.create).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'Test',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...key',
        type: 'standard',
        status: 'active',
        expiresAt: null,
        lastUsedAt: null,
        createdAt: '2024-03-15T10:00:00Z',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'Test' }
      );
      const result = await routeHandlers['/api/keys'](request);

      expect(result.key).toBe('sk_live_secret_key');
      expect(result.apiKey.keyPreview).not.toContain('secret_key');
    });
  });

  describe('GET /api/keys/:id', () => {
    beforeEach(async () => {
      await keysRoutes(mockServer as any);
    });

    it('should return API key details', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'Production Key',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...abcd',
        type: 'standard',
        status: 'active',
        lastUsedAt: '2024-03-15T10:00:00Z',
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: null,
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'key-1' }
      );
      const result = await routeHandlers['/api/keys/:id'](request);

      expect(result.id).toBe('key-1');
      expect(result.name).toBe('Production Key');
      expect(result).not.toHaveProperty('keyHash');
    });

    it('should throw NotFoundError when key does not exist', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'nonexistent' }
      );

      await expect(routeHandlers['/api/keys/:id'](request)).rejects.toThrow('API key not found');
    });

    it('should throw NotFoundError when key belongs to different account', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        accountId: 'different-account',
        name: 'Other Key',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...abcd',
        type: 'standard',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: null,
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'key-1' }
      );

      await expect(routeHandlers['/api/keys/:id'](request)).rejects.toThrow('API key not found');
    });
  });

  describe('PATCH /api/keys/:id', () => {
    beforeEach(async () => {
      await keysRoutes(mockServer as any);
    });

    it('should update API key name', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById)
        .mockResolvedValueOnce({
          id: 'key-1',
          accountId: 'account-123',
          name: 'Old Name',
          keyHash: 'hashed',
          keyPreview: 'sk_live_...abcd',
          type: 'standard',
          status: 'active',
          lastUsedAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
        })
        .mockResolvedValueOnce({
          id: 'key-1',
          accountId: 'account-123',
          name: 'New Name',
          keyHash: 'hashed',
          keyPreview: 'sk_live_...abcd',
          type: 'standard',
          status: 'active',
          lastUsedAt: null,
          createdAt: '2024-01-01T00:00:00Z',
          expiresAt: null,
        });
      vi.mocked(apiKeyRepository.update).mockResolvedValue(undefined);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'New Name' },
        { id: 'key-1' }
      );
      const result = await routeHandlers['/api/keys/:id (PATCH)'](request);

      expect(apiKeyRepository.update).toHaveBeenCalledWith('key-1', { name: 'New Name' });
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundError when updating non-existent key', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { name: 'New Name' },
        { id: 'nonexistent' }
      );

      await expect(routeHandlers['/api/keys/:id (PATCH)'](request)).rejects.toThrow('API key not found');
    });

    it('should validate name has minimum length', async () => {
      expect(routeSchemas['/api/keys/:id (PATCH)']).toBeDefined();
      expect(routeSchemas['/api/keys/:id (PATCH)'].schema.body.properties.name.minLength).toBe(1);
    });
  });

  describe('DELETE /api/keys/:id', () => {
    beforeEach(async () => {
      await keysRoutes(mockServer as any);
    });

    it('should revoke API key and return 204', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        accountId: 'account-123',
        name: 'To Revoke',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...abcd',
        type: 'standard',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: null,
      });
      vi.mocked(apiKeyRepository.revoke).mockResolvedValue(undefined);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'key-1' }
      );
      const reply = mockReply();
      await routeHandlers['/api/keys/:id (DELETE)'](request, reply);

      expect(apiKeyRepository.revoke).toHaveBeenCalledWith('key-1');
      expect(reply.code).toHaveBeenCalledWith(204);
    });

    it('should throw NotFoundError when revoking non-existent key', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'nonexistent' }
      );
      const reply = mockReply();

      await expect(routeHandlers['/api/keys/:id (DELETE)'](request, reply)).rejects.toThrow('API key not found');
    });

    it('should throw NotFoundError when revoking key from different account', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(apiKeyRepository.findById).mockResolvedValue({
        id: 'key-1',
        accountId: 'different-account',
        name: 'Other Key',
        keyHash: 'hashed',
        keyPreview: 'sk_live_...abcd',
        type: 'standard',
        status: 'active',
        lastUsedAt: null,
        createdAt: '2024-01-01T00:00:00Z',
        expiresAt: null,
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'key-1' }
      );
      const reply = mockReply();

      await expect(routeHandlers['/api/keys/:id (DELETE)'](request, reply)).rejects.toThrow('API key not found');
    });
  });
});
