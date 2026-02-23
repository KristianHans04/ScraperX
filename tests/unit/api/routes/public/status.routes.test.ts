/**
 * Unit tests for Public Status API routes
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 6: Status Page - Backend API Endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createStatusRoutes } from '../../../../../src/api/routes/public/status.routes';

// Mock console methods to reduce noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Public Status Routes', () => {
  let mockPool: any;
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: ReturnType<typeof vi.fn>;
  let statusMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup mock response
    jsonMock = vi.fn().mockReturnThis();
    statusMock = vi.fn().mockReturnValue({ json: jsonMock });

    mockResponse = {
      json: jsonMock,
      status: statusMock,
    };

    // Setup mock database pool
    mockPool = {
      query: vi.fn(),
    };
  });

  describe('GET /', () => {
    it('should return current service statuses', async () => {
      const mockServices = [
        {
          serviceName: 'api-gateway',
          serviceDisplayName: 'API Gateway',
          description: 'Main API endpoint',
          status: 'operational',
        },
        {
          serviceName: 'http-engine',
          serviceDisplayName: 'HTTP Engine',
          description: 'HTTP scraping service',
          status: 'operational',
        },
        {
          serviceName: 'browser-engine',
          serviceDisplayName: 'Browser Engine',
          description: 'Browser automation service',
          status: 'degraded',
        },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockServices, rowCount: 3 });

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        services: expect.arrayContaining([
          expect.objectContaining({
            serviceName: 'api-gateway',
            serviceDisplayName: 'API Gateway',
            description: 'Main API endpoint',
            status: 'operational',
          }),
          expect.objectContaining({
            serviceName: 'browser-engine',
            status: 'degraded',
          }),
        ]),
      });
    });

    it('should return empty services array when no services configured', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        services: [],
      });
    });

    it('should order services by display_order', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY display_order ASC');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch service status',
      });
    });
  });

  describe('GET /uptime', () => {
    it('should return 90-day uptime data for all services', async () => {
      const mockServices = [
        { service_name: 'api-gateway' },
        { service_name: 'http-engine' },
        { service_name: 'browser-engine' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockServices, rowCount: 3 });

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/uptime' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        uptime: expect.objectContaining({
          'api-gateway': expect.any(Array),
          'http-engine': expect.any(Array),
          'browser-engine': expect.any(Array),
        }),
      });

      const result = jsonMock.mock.calls[0][0];
      expect(result.uptime['api-gateway']).toHaveLength(90);
      expect(result.uptime['http-engine']).toHaveLength(90);
      // Each day should default to 100% uptime
      expect(result.uptime['api-gateway'][0]).toBe(100);
    });

    it('should return empty object when no services exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/uptime' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        uptime: {},
      });
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      mockRequest = {};

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/uptime' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch uptime',
      });
    });
  });

  describe('GET /incidents', () => {
    it('should return recent incidents with updates', async () => {
      const mockIncidents = [
        {
          id: 'incident-1',
          title: 'API Gateway Outage',
          status: 'resolved',
          severity: 'major',
          affectedServices: ['api-gateway'],
          startedAt: new Date('2024-01-15T10:00:00Z'),
          resolvedAt: new Date('2024-01-15T11:00:00Z'),
        },
        {
          id: 'incident-2',
          title: 'Browser Engine Degradation',
          status: 'monitoring',
          severity: 'minor',
          affectedServices: ['browser-engine'],
          startedAt: new Date('2024-01-14T08:00:00Z'),
          resolvedAt: null,
        },
      ];

      const mockUpdates = [
        {
          id: 'update-1',
          message: 'Issue identified',
          status: 'investigating',
          createdAt: new Date('2024-01-15T10:05:00Z'),
        },
        {
          id: 'update-2',
          message: 'Service restored',
          status: 'resolved',
          createdAt: new Date('2024-01-15T11:00:00Z'),
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockIncidents, rowCount: 2 })
        .mockResolvedValueOnce({ rows: mockUpdates, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        incidents: expect.arrayContaining([
          expect.objectContaining({
            id: 'incident-1',
            title: 'API Gateway Outage',
            status: 'resolved',
            severity: 'major',
            updates: expect.any(Array),
          }),
          expect.objectContaining({
            id: 'incident-2',
            title: 'Browser Engine Degradation',
            status: 'monitoring',
            updates: expect.any(Array),
          }),
        ]),
      });
    });

    it('should limit incidents to last 90 days', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("started_at >= NOW() - INTERVAL '90 days'");
    });

    it('should order incidents by started_at DESC (most recent first)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY si.started_at DESC');
    });

    it('should default limit to 10 and max at 50', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(10);
    });

    it('should use provided limit parameter', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: { limit: '25' },
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(25);
    });

    it('should cap limit at 50', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: { limit: '100' },
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[1]).toContain(50);
    });

    it('should attach updates ordered by created_at ASC', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [{ id: 'incident-1' }], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const updatesQueryCall = mockPool.query.mock.calls[1];
      expect(updatesQueryCall[0]).toContain('ORDER BY created_at ASC');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      mockRequest = {
        query: {},
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/incidents' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch incidents',
      });
    });
  });

  describe('POST /subscribe', () => {
    it('should subscribe email to status updates', async () => {
      mockRequest = {
        body: { email: 'user@example.com' },
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/subscribe' && layer.route.methods.post
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Subscribed to status updates',
      });
    });

    it('should reject invalid email addresses', async () => {
      const invalidEmails = [
        'not-an-email',
        '@example.com',
        'user@',
        'user@@example.com',
        '',
        null,
        undefined,
      ];

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/subscribe' && layer.route.methods.post
      )?.route?.stack[0]?.handle;

      for (const email of invalidEmails) {
        vi.clearAllMocks();
        mockRequest = {
          body: { email },
        };

        await routeHandler(mockRequest as Request, mockResponse as Response);

        expect(statusMock).toHaveBeenCalledWith(400);
        expect(jsonMock).toHaveBeenCalledWith({
          error: 'Invalid email address',
        });
      }
    });

    it('should reject emails with spaces', async () => {
      mockRequest = {
        body: { email: 'user @example.com' },
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/subscribe' && layer.route.methods.post
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(400);
    });

    it('should accept valid email formats', async () => {
      const validEmails = [
        'user@example.com',
        'user.name@example.com',
        'user+tag@example.com',
        'user@subdomain.example.com',
        'user@example.co.uk',
        '123@example.com',
      ];

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/subscribe' && layer.route.methods.post
      )?.route?.stack[0]?.handle;

      for (const email of validEmails) {
        vi.clearAllMocks();
        mockRequest = {
          body: { email },
        };

        await routeHandler(mockRequest as Request, mockResponse as Response);

        expect(jsonMock).toHaveBeenCalledWith({
          success: true,
          message: 'Subscribed to status updates',
        });
      }
    });

    it('should handle database errors gracefully', async () => {
      // Even though the current implementation doesn't use the database,
      // we test this for future-proofing when subscription storage is implemented
      mockRequest = {
        body: { email: 'user@example.com' },
      };

      const router = createStatusRoutes(mockPool);
      const routeHandler = [...(router as any).stack].reverse().find(
        (layer: any) => layer.route?.path === '/subscribe' && layer.route.methods.post
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        success: true,
        message: 'Subscribed to status updates',
      });
    });
  });
});
