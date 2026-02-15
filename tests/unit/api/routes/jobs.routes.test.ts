/**
 * Unit tests for Jobs Routes
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { jobsRoutes } from '@api/routes/jobs.routes.js';
import { 
  scrapeJobRepository, 
  jobResultRepository, 
  sessionRepository, 
  userRepository 
} from '../../../src/db/index.js';
import { getQueueForEngine } from '../../../src/queue/queues.js';

// Mock the dependencies
vi.mock('../../../src/db/index', () => ({
  scrapeJobRepository: {
    findByAccountId: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
  },
  jobResultRepository: {
    findByJobId: vi.fn(),
  },
  sessionRepository: {
    get: vi.fn(),
  },
  userRepository: {
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/queue/queues', () => ({
  getQueueForEngine: vi.fn(),
}));

describe('Jobs Routes', () => {
  let mockServer: any;
  let routeHandlers: Record<string, Function>;

  beforeEach(() => {
    vi.clearAllMocks();
    routeHandlers = {};
    mockServer = {
      get: vi.fn((path: string, handler: Function) => {
        routeHandlers[path] = handler;
      }),
      post: vi.fn((path: string, handler: Function) => {
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
    type: vi.fn().mockReturnThis(),
    header: vi.fn().mockReturnThis(),
  });

  const mockUser = {
    id: 'user-123',
    accountId: 'account-123',
    email: 'test@example.com',
  };

  const mockJob = {
    id: 'job-1',
    accountId: 'account-123',
    apiKeyId: 'key-1',
    url: 'https://example.com',
    engine: 'http',
    status: 'completed',
    creditsUsed: 10,
    duration: 1500,
    createdAt: '2024-03-15T10:00:00Z',
    completedAt: '2024-03-15T10:00:02Z',
    options: { headers: {} },
    error: null,
    retryCount: 0,
  };

  describe('GET /api/jobs', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should return paginated list of jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed', url: 'https://test.com' },
      ]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(2);
      expect(result.pagination).toEqual({
        page: 1,
        limit: 20,
        total: 2,
        totalPages: 1,
      });
    });

    it('should filter by status', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed' },
        { ...mockJob, id: 'job-3', status: 'completed' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { status: 'completed' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((j: any) => j.status === 'completed')).toBe(true);
    });

    it('should filter by engine', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', engine: 'browser' },
        { ...mockJob, id: 'job-3', engine: 'http' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { engine: 'http' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((j: any) => j.engine === 'http')).toBe(true);
    });

    it('should search by URL', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', url: 'https://test.com' },
        { ...mockJob, id: 'job-3', url: 'https://example.com/page' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { search: 'example' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(2);
      expect(result.data.every((j: any) => j.url.includes('example'))).toBe(true);
    });

    it('should handle case-insensitive search', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJob, url: 'https://EXAMPLE.com' },
        { ...mockJob, url: 'https://test.com' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { search: 'example' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(1);
    });

    it('should paginate correctly', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue(
        Array(50).fill(null).map((_, i) => ({ ...mockJob, id: `job-${i}` }))
      );

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { page: '2', limit: '10' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(10);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.totalPages).toBe(5);
    });

    it('should return empty array when no jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([]);

      const request = createMockRequest({ sessionId: 'valid-session' });
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toEqual([]);
    });

    it('should apply multiple filters', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed', engine: 'http' },
        { ...mockJob, id: 'job-3', status: 'completed', engine: 'browser' },
        { ...mockJob, id: 'job-4', status: 'completed', engine: 'http' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        {},
        { status: 'completed', engine: 'http' }
      );
      const result = await routeHandlers['/api/jobs'](request);

      expect(result.data).toHaveLength(2);
    });
  });

  describe('GET /api/jobs/:id', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should return job details with result', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);
      vi.mocked(jobResultRepository.findByJobId).mockResolvedValue({
        jobId: 'job-1',
        content: '<html>Test</html>',
        contentType: 'text/html',
        size: 1024,
        metadata: { title: 'Test Page' },
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id'](request);

      expect(result.id).toBe('job-1');
      expect(result.status).toBe('completed');
      expect(result.result).toBeDefined();
      expect(result.result.content).toBe('<html>Test</html>');
    });

    it('should return job without result for non-completed jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'pending',
        completedAt: null,
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id'](request);

      expect(result.status).toBe('pending');
      expect(result.result).toBeNull();
    });

    it('should throw NotFoundError when job does not exist', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'nonexistent' }
      );

      await expect(routeHandlers['/api/jobs/:id'](request)).rejects.toThrow('Job not found');
    });

    it('should throw NotFoundError when job belongs to different account', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        accountId: 'different-account',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );

      await expect(routeHandlers['/api/jobs/:id'](request)).rejects.toThrow('Job not found');
    });

    it('should include error information for failed jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'failed',
        error: 'Connection timeout',
        completedAt: '2024-03-15T10:00:05Z',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id'](request);

      expect(result.status).toBe('failed');
      expect(result.error).toBe('Connection timeout');
    });
  });

  describe('GET /api/jobs/:id/logs', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should return job logs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id/logs'](request);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(2);
      expect(result[0]).toHaveProperty('timestamp');
      expect(result[0]).toHaveProperty('level');
      expect(result[0]).toHaveProperty('message');
    });

    it('should include completion log for completed jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id/logs'](request);

      const completionLog = result.find((log: any) => log.message.includes('completed'));
      expect(completionLog).toBeDefined();
      expect(completionLog.level).toBe('info');
    });

    it('should include error log for failed jobs', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'failed',
        error: 'Network error',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id/logs'](request);

      const errorLog = result.find((log: any) => log.level === 'error');
      expect(errorLog).toBeDefined();
      expect(errorLog.message).toContain('Network error');
    });

    it('should throw NotFoundError when job not found', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'nonexistent' }
      );

      await expect(routeHandlers['/api/jobs/:id/logs'](request)).rejects.toThrow('Job not found');
    });
  });

  describe('GET /api/jobs/:id/result', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should return job result for completed job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);
      vi.mocked(jobResultRepository.findByJobId).mockResolvedValue({
        jobId: 'job-1',
        content: '{"data": "test"}',
        contentType: 'application/json',
        size: 256,
        metadata: {},
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id/result'](request);

      expect(result.content).toBe('{"data": "test"}');
      expect(result.contentType).toBe('application/json');
    });

    it('should throw NotFoundError when job not completed', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'pending',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );

      await expect(routeHandlers['/api/jobs/:id/result'](request)).rejects.toThrow('Result not available');
    });

    it('should throw NotFoundError when result not found', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);
      vi.mocked(jobResultRepository.findByJobId).mockResolvedValue(null);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );

      await expect(routeHandlers['/api/jobs/:id/result'](request)).rejects.toThrow('Result not found');
    });
  });

  describe('POST /api/jobs/:id/retry', () => {
    const mockQueue = {
      add: vi.fn(),
    };

    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
      vi.mocked(getQueueForEngine).mockReturnValue(mockQueue as any);
    });

    it('should retry a failed job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'failed',
      });
      vi.mocked(scrapeJobRepository.create).mockResolvedValue({
        ...mockJob,
        id: 'job-new',
        status: 'pending',
        retryCount: 1,
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const result = await routeHandlers['/api/jobs/:id/retry'](request);

      expect(result.jobId).toBe('job-new');
      expect(scrapeJobRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        accountId: 'account-123',
        url: 'https://example.com',
        engine: 'http',
        status: 'pending',
        retryCount: 1,
      }));
      expect(mockQueue.add).toHaveBeenCalled();
    });

    it('should retry a cancelled job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'cancelled',
      });
      vi.mocked(scrapeJobRepository.create).mockResolvedValue({
        ...mockJob,
        id: 'job-new',
        status: 'pending',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      await routeHandlers['/api/jobs/:id/retry'](request);

      expect(scrapeJobRepository.create).toHaveBeenCalled();
    });

    it('should throw error when retrying non-failed/cancelled job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );

      await expect(routeHandlers['/api/jobs/:id/retry'](request)).rejects.toThrow('Can only retry failed or cancelled jobs');
    });

    it('should queue new job to correct engine queue', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'failed',
        engine: 'browser',
      });
      vi.mocked(scrapeJobRepository.create).mockResolvedValue({
        ...mockJob,
        id: 'job-new',
        engine: 'browser',
      });

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      await routeHandlers['/api/jobs/:id/retry'](request);

      expect(getQueueForEngine).toHaveBeenCalledWith('browser');
      expect(mockQueue.add).toHaveBeenCalledWith('scrape', expect.any(Object));
    });
  });

  describe('POST /api/jobs/:id/cancel', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should cancel a pending job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'pending',
      });
      vi.mocked(scrapeJobRepository.update).mockResolvedValue(undefined);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const reply = mockReply();
      await routeHandlers['/api/jobs/:id/cancel'](request, reply);

      expect(scrapeJobRepository.update).toHaveBeenCalledWith('job-1', { status: 'cancelled' });
      expect(reply.code).toHaveBeenCalledWith(204);
    });

    it('should cancel a running job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue({
        ...mockJob,
        status: 'running',
      });
      vi.mocked(scrapeJobRepository.update).mockResolvedValue(undefined);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const reply = mockReply();
      await routeHandlers['/api/jobs/:id/cancel'](request, reply);

      expect(scrapeJobRepository.update).toHaveBeenCalledWith('job-1', { status: 'cancelled' });
    });

    it('should throw error when cancelling non-pending/running job', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findById).mockResolvedValue(mockJob);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {},
        { id: 'job-1' }
      );
      const reply = mockReply();

      await expect(routeHandlers['/api/jobs/:id/cancel'](request, reply)).rejects.toThrow('Can only cancel pending or running jobs');
    });
  });

  describe('POST /api/jobs/export', () => {
    beforeEach(async () => {
      await jobsRoutes(mockServer as any);
    });

    it('should export jobs as CSV', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed', duration: null },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {}
      );
      const reply = mockReply();
      const result = await routeHandlers['/api/jobs/export'](request, reply);

      expect(reply.type).toHaveBeenCalledWith('text/csv');
      expect(reply.header).toHaveBeenCalledWith('Content-Disposition', 'attachment; filename="jobs.csv"');
      expect(typeof result).toBe('string');
      expect(result).toContain('ID,URL,Engine,Status');
      expect(result).toContain('job-1');
    });

    it('should filter exported jobs by status', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        mockJob,
        { ...mockJob, id: 'job-2', status: 'failed' },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        { status: 'completed' }
      );
      const reply = mockQuote();
      const result = await routeHandlers['/api/jobs/export'](request, reply);

      expect(result).toContain('job-1');
      expect(result).not.toContain('job-2');
    });

    it('should handle jobs with null duration', async () => {
      vi.mocked(sessionRepository.get).mockResolvedValue('user-123');
      vi.mocked(userRepository.findById).mockResolvedValue(mockUser);
      vi.mocked(scrapeJobRepository.findByAccountId).mockResolvedValue([
        { ...mockJob, duration: null },
      ]);

      const request = createMockRequest(
        { sessionId: 'valid-session' },
        {}
      );
      const reply = mockReply();
      const result = await routeHandlers['/api/jobs/export'](request, reply);

      expect(result).toContain(',"",'); // Empty duration field
    });
  });
});
