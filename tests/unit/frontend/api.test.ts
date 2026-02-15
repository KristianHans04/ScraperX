/**
 * Unit tests for API client
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { api, ApiError } from '../../../src/frontend/lib/api.js';

describe('API Client', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('ApiError', () => {
    it('should create ApiError with status and message', () => {
      const error = new ApiError(404, 'Not found');
      expect(error.status).toBe(404);
      expect(error.message).toBe('Not found');
      expect(error.name).toBe('ApiError');
    });

    it('should create ApiError with additional data', () => {
      const data = { field: 'email', error: 'Invalid' };
      const error = new ApiError(400, 'Bad request', data);
      expect(error.data).toEqual(data);
    });

    it('should be instance of Error', () => {
      const error = new ApiError(500, 'Server error');
      expect(error).toBeInstanceOf(Error);
    });
  });

  describe('GET requests', () => {
    it('should make GET request successfully', async () => {
      const mockData = { id: 1, name: 'Test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockData),
      } as Response);

      const result = await api.get('/test');

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      expect(result).toEqual(mockData);
    });

    it('should handle GET with query parameters', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await api.get('/test', {
        params: { page: 1, limit: 10, search: 'query' },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test?page=1&limit=10&search=query',
        expect.any(Object)
      );
    });

    it('should convert boolean params to string', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve([]),
      } as Response);

      await api.get('/test', {
        params: { active: true },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test?active=true',
        expect.any(Object)
      );
    });
  });

  describe('POST requests', () => {
    it('should make POST request with data', async () => {
      const requestData = { name: 'Test' };
      const responseData = { id: 1, name: 'Test' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      } as Response);

      const result = await api.post('/test', requestData);

      expect(fetch).toHaveBeenCalledWith('/api/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });
      expect(result).toEqual(responseData);
    });

    it('should handle POST without body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.post('/test');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          method: 'POST',
          body: undefined,
        })
      );
    });
  });

  describe('PATCH requests', () => {
    it('should make PATCH request with data', async () => {
      const requestData = { name: 'Updated' };
      const responseData = { id: 1, name: 'Updated' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(responseData),
      } as Response);

      const result = await api.patch('/test/1', requestData);

      expect(fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData),
        credentials: 'include',
      });
      expect(result).toEqual(responseData);
    });

    it('should handle PATCH without body', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.patch('/test/1');

      expect(fetch).toHaveBeenCalledWith(
        '/api/test/1',
        expect.objectContaining({
          method: 'PATCH',
          body: undefined,
        })
      );
    });
  });

  describe('DELETE requests', () => {
    it('should make DELETE request', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      } as Response);

      await api.delete('/test/1');

      expect(fetch).toHaveBeenCalledWith('/api/test/1', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
    });

    it('should handle DELETE with options', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api.delete('/test/1', { params: { force: true } });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test/1?force=true',
        expect.any(Object)
      );
    });
  });

  describe('Error handling', () => {
    it('should throw ApiError on 4xx response', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 400,
        json: () => Promise.resolve({ message: 'Bad request' }),
      } as Response);

      await expect(api.get('/test')).rejects.toThrow(ApiError);
      await expect(api.get('/test')).rejects.toThrow('Bad request');
    });

    it('should throw ApiError on 5xx response', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({ message: 'Server error' }),
      } as Response);

      await expect(api.get('/test')).rejects.toThrow(ApiError);
    });

    it('should include status in ApiError', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 404,
        json: () => Promise.resolve({ message: 'Not found' }),
      } as Response);

      try {
        await api.get('/test');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).status).toBe(404);
      }
    });

    it('should include error data in ApiError', async () => {
      const errorData = { field: 'email', error: 'Invalid format' };
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 422,
        json: () => Promise.resolve({ message: 'Validation failed', ...errorData }),
      } as Response);

      try {
        await api.post('/test', {});
      } catch (error) {
        expect(error).toBeInstanceOf(ApiError);
        expect((error as ApiError).data).toBeDefined();
      }
    });

    it('should use default error message when response has no message', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.resolve({}),
      } as Response);

      await expect(api.get('/test')).rejects.toThrow('Request failed');
    });

    it('should handle non-JSON error responses', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: false,
        status: 500,
        json: () => Promise.reject(new Error('Invalid JSON')),
      } as Response);

      await expect(api.get('/test')).rejects.toThrow('An error occurred');
    });
  });

  describe('Custom headers', () => {
    it('should merge custom headers', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api.get('/test', {
        headers: { 'X-Custom-Header': 'value' },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
            'X-Custom-Header': 'value',
          },
        })
      );
    });

    it('should allow overriding Content-Type', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api.get('/test', {
        headers: { 'Content-Type': 'text/plain' },
      });

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          headers: {
            'Content-Type': 'text/plain',
          },
        })
      );
    });
  });

  describe('Request options', () => {
    it('should pass through additional fetch options', async () => {
      vi.mocked(fetch).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({}),
      } as Response);

      await api.get('/test', {
        cache: 'no-cache',
        mode: 'cors',
      } as RequestInit);

      expect(fetch).toHaveBeenCalledWith(
        '/api/test',
        expect.objectContaining({
          cache: 'no-cache',
          mode: 'cors',
        })
      );
    });
  });
});
