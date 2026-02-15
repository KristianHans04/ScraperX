/**
 * Unit tests for Public Blog API routes
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 5: Blog - Backend API Endpoints
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Request, Response } from 'express';
import { createBlogRoutes } from '../../../../src/api/routes/public/blog.routes';

// Mock console methods to reduce noise in test output
vi.spyOn(console, 'error').mockImplementation(() => {});
vi.spyOn(console, 'log').mockImplementation(() => {});

describe('Public Blog Routes', () => {
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

  describe('GET /posts', () => {
    it('should return paginated list of published blog posts', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Test Post 1',
          slug: 'test-post-1',
          excerpt: 'Test excerpt 1',
          featuredImageUrl: 'https://example.com/image1.jpg',
          tags: ['tutorial', 'guide'],
          publishedAt: new Date('2024-01-01'),
          authorName: 'John Doe',
        },
        {
          id: 'post-2',
          title: 'Test Post 2',
          slug: 'test-post-2',
          excerpt: 'Test excerpt 2',
          featuredImageUrl: null,
          tags: ['api'],
          publishedAt: new Date('2024-01-02'),
          authorName: 'Jane Smith',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockPosts, rowCount: 2 })
        .mockResolvedValueOnce({ rows: [{ count: '2' }], rowCount: 1 });

      mockRequest = {
        query: { page: '1', perPage: '12' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(mockPool.query).toHaveBeenCalledTimes(2);
      expect(jsonMock).toHaveBeenCalledWith({
        posts: expect.arrayContaining([
          expect.objectContaining({
            id: 'post-1',
            title: 'Test Post 1',
            slug: 'test-post-1',
            excerpt: 'Test excerpt 1',
            featuredImageUrl: 'https://example.com/image1.jpg',
            tags: ['tutorial', 'guide'],
            publishedAt: expect.any(Date),
            author: { name: 'John Doe' },
          }),
        ]),
        page: 1,
        perPage: 12,
        totalPosts: 2,
        totalPages: 1,
      });
    });

    it('should filter posts by tag when tag parameter provided', async () => {
      const mockPosts = [
        {
          id: 'post-1',
          title: 'Tutorial Post',
          slug: 'tutorial-post',
          excerpt: 'A tutorial',
          featuredImageUrl: null,
          tags: ['tutorial'],
          publishedAt: new Date('2024-01-01'),
          authorName: 'Author Name',
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: mockPosts, rowCount: 1 })
        .mockResolvedValueOnce({ rows: [{ count: '1' }], rowCount: 1 });

      mockRequest = {
        query: { tag: 'tutorial', page: '1', perPage: '12' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      // Verify the query includes tag filter
      const firstQueryCall = mockPool.query.mock.calls[0];
      expect(firstQueryCall[0]).toContain('= ANY(bp.tags)');
      expect(firstQueryCall[1]).toContain('tutorial');
    });

    it('should use default pagination when not specified', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      mockRequest = {
        query: {},
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          page: 1,
          perPage: 12,
        })
      );
    });

    it('should cap perPage at 50 to prevent abuse', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      mockRequest = {
        query: { perPage: '100' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const firstQueryCall = mockPool.query.mock.calls[0];
      expect(firstQueryCall[1]).toContain(50); // Should be capped at 50
    });

    it('should calculate totalPages correctly', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '25' }], rowCount: 1 });

      mockRequest = {
        query: { perPage: '10' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          totalPosts: 25,
          totalPages: 3, // 25 posts / 10 per page = 3 pages
        })
      );
    });

    it('should only return published posts with published_at <= NOW()', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      mockRequest = {
        query: {},
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const firstQueryCall = mockPool.query.mock.calls[0];
      expect(firstQueryCall[0]).toContain("status = 'published'");
      expect(firstQueryCall[0]).toContain('published_at <= NOW()');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database connection failed'));

      mockRequest = {
        query: {},
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch blog posts',
      });
    });

    it('should order posts by published_at DESC (newest first)', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [], rowCount: 0 })
        .mockResolvedValueOnce({ rows: [{ count: '0' }], rowCount: 1 });

      mockRequest = {
        query: {},
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const firstQueryCall = mockPool.query.mock.calls[0];
      expect(firstQueryCall[0]).toContain('ORDER BY bp.published_at DESC');
    });
  });

  describe('GET /posts/:slug', () => {
    it('should return a single published blog post by slug', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Test Post',
        slug: 'test-post',
        content: '# Markdown content',
        excerpt: 'Test excerpt',
        featuredImageUrl: 'https://example.com/image.jpg',
        tags: ['tutorial'],
        publishedAt: new Date('2024-01-01'),
        authorName: 'John Doe',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPost], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        params: { slug: 'test-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        post: expect.objectContaining({
          id: 'post-1',
          title: 'Test Post',
          slug: 'test-post',
          content: '# Markdown content',
          excerpt: 'Test excerpt',
          featuredImageUrl: 'https://example.com/image.jpg',
          tags: ['tutorial'],
          publishedAt: expect.any(Date),
          author: { name: 'John Doe' },
        }),
        relatedPosts: [],
      });
    });

    it('should return 404 when post not found', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        params: { slug: 'non-existent-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Blog post not found',
      });
    });

    it('should include related posts with matching tags', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Main Post',
        slug: 'main-post',
        content: 'Content',
        excerpt: 'Excerpt',
        featuredImageUrl: null,
        tags: ['tutorial', 'api'],
        publishedAt: new Date('2024-01-01'),
        authorName: 'Author',
      };

      const mockRelatedPosts = [
        {
          id: 'post-2',
          title: 'Related Post 1',
          slug: 'related-post-1',
          excerpt: 'Related excerpt 1',
          featuredImageUrl: 'https://example.com/related1.jpg',
        },
        {
          id: 'post-3',
          title: 'Related Post 2',
          slug: 'related-post-2',
          excerpt: 'Related excerpt 2',
          featuredImageUrl: null,
        },
      ];

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPost], rowCount: 1 })
        .mockResolvedValueOnce({ rows: mockRelatedPosts, rowCount: 2 });

      mockRequest = {
        params: { slug: 'main-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith(
        expect.objectContaining({
          relatedPosts: expect.arrayContaining([
            expect.objectContaining({
              id: 'post-2',
              title: 'Related Post 1',
            }),
          ]),
        })
      );
    });

    it('should limit related posts to 3', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Main Post',
        slug: 'main-post',
        content: 'Content',
        excerpt: 'Excerpt',
        featuredImageUrl: null,
        tags: ['tutorial'],
        publishedAt: new Date('2024-01-01'),
        authorName: 'Author',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPost], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        params: { slug: 'main-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const relatedQueryCall = mockPool.query.mock.calls[1];
      expect(relatedQueryCall[0]).toContain('LIMIT 3');
    });

    it('should exclude current post from related posts', async () => {
      const mockPost = {
        id: 'post-1',
        title: 'Main Post',
        slug: 'main-post',
        content: 'Content',
        excerpt: 'Excerpt',
        featuredImageUrl: null,
        tags: ['tutorial'],
        publishedAt: new Date('2024-01-01'),
        authorName: 'Author',
      };

      mockPool.query
        .mockResolvedValueOnce({ rows: [mockPost], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {
        params: { slug: 'main-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const relatedQueryCall = mockPool.query.mock.calls[1];
      expect(relatedQueryCall[0]).toContain('bp.id != $1');
      expect(relatedQueryCall[1]).toContain('post-1');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      mockRequest = {
        params: { slug: 'test-post' },
      };

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/posts/:slug' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch blog post',
      });
    });
  });

  describe('GET /tags', () => {
    it('should return all unique tags from published posts', async () => {
      const mockTags = [
        { tag: 'api' },
        { tag: 'guide' },
        { tag: 'tutorial' },
      ];

      mockPool.query.mockResolvedValueOnce({ rows: mockTags, rowCount: 3 });

      mockRequest = {};

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/tags' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        tags: ['api', 'guide', 'tutorial'],
      });
    });

    it('should return empty array when no tags exist', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/tags' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(jsonMock).toHaveBeenCalledWith({
        tags: [],
      });
    });

    it('should order tags alphabetically', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/tags' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY tag');
    });

    it('should only include tags from published posts', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [], rowCount: 0 });

      mockRequest = {};

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/tags' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      const queryCall = mockPool.query.mock.calls[0];
      expect(queryCall[0]).toContain("status = 'published'");
      expect(queryCall[0]).toContain('published_at <= NOW()');
    });

    it('should handle database errors gracefully', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      mockRequest = {};

      const router = createBlogRoutes(mockPool);
      const routeHandler = (router as any).stack.find(
        (layer: any) => layer.route?.path === '/tags' && layer.route.methods.get
      )?.route?.stack[0]?.handle;

      await routeHandler(mockRequest as Request, mockResponse as Response);

      expect(statusMock).toHaveBeenCalledWith(500);
      expect(jsonMock).toHaveBeenCalledWith({
        error: 'Failed to fetch blog tags',
      });
    });
  });
});
