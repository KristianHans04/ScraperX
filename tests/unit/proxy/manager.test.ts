/**
 * Unit tests for proxy manager
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../../../src/config/index.js', () => ({
  config: {
    proxy: {
      enabled: true,
      datacenterUrl: 'http://user:pass@dc.proxy.com:8080',
      residentialUrl: 'http://user:pass@res.proxy.com:8080',
      mobileUrl: 'http://user:pass@mobile.proxy.com:8080',
    },
  },
}));

vi.mock('../../../src/utils/logger.js', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { 
  ProxyManager, 
  getProxyManager, 
  formatProxyForHttp, 
  formatProxyForPlaywright,
  validateProxy,
} from '../../../src/proxy/index.js';
import { mockDatacenterProxy, mockResidentialProxy } from '../../fixtures/index.js';

describe('Proxy Manager', () => {
  let manager: ProxyManager;

  beforeEach(() => {
    vi.clearAllMocks();
    manager = new ProxyManager();
  });

  describe('constructor', () => {
    it('should initialize with providers from config', () => {
      const stats = manager.getStats();
      
      expect(stats.providers.length).toBeGreaterThan(0);
      expect(stats.activeSessions).toBe(0);
    });
  });

  describe('addProvider', () => {
    it('should add a proxy provider', () => {
      manager.addProvider({
        name: 'test-provider',
        type: 'datacenter',
        url: 'http://test:test@proxy.test:8080',
        enabled: true,
        weight: 1,
      });

      const stats = manager.getStats();
      expect(stats.providers.some(p => p.name === 'test-provider')).toBe(true);
    });
  });

  describe('removeProvider', () => {
    it('should remove a proxy provider', () => {
      manager.addProvider({
        name: 'to-remove',
        type: 'datacenter',
        url: 'http://proxy.test:8080',
        enabled: true,
        weight: 1,
      });

      manager.removeProvider('to-remove');

      const stats = manager.getStats();
      expect(stats.providers.some(p => p.name === 'to-remove')).toBe(false);
    });
  });

  describe('getProxy', () => {
    it('should return a proxy for requested tier', async () => {
      const proxy = await manager.getProxy({ tier: 'datacenter' });

      expect(proxy).not.toBeNull();
      expect(proxy?.type).toBe('datacenter');
    });

    it('should return null if no providers available', async () => {
      const emptyManager = new ProxyManager();
      // Remove all providers
      for (const provider of emptyManager.getStats().providers) {
        emptyManager.removeProvider(provider.name);
      }

      const proxy = await emptyManager.getProxy({ tier: 'isp' });
      expect(proxy).toBeNull();
    });

    it('should reuse session if sessionId provided', async () => {
      const sessionId = 'test-session-123';
      
      const proxy1 = await manager.getProxy({ tier: 'datacenter', sessionId });
      const proxy2 = await manager.getProxy({ tier: 'datacenter', sessionId });

      expect(proxy1?.id).toBe(proxy2?.id);
    });

    it('should create new session for new sessionId', async () => {
      const proxy1 = await manager.getProxy({ tier: 'datacenter', sessionId: 'session1' });
      const proxy2 = await manager.getProxy({ tier: 'datacenter', sessionId: 'session2' });

      // Both sessions should exist (2 active sessions)
      expect(manager.getStats().activeSessions).toBe(2);
      
      // Both should return valid proxies
      expect(proxy1).not.toBeNull();
      expect(proxy2).not.toBeNull();
    });

    it('should include country/city in proxy config', async () => {
      const proxy = await manager.getProxy({
        tier: 'datacenter',
        country: 'US',
        city: 'New York',
      });

      expect(proxy?.country).toBe('US');
      expect(proxy?.city).toBe('New York');
    });
  });

  describe('releaseSession', () => {
    it('should remove the session', async () => {
      const sessionId = 'to-release';
      await manager.getProxy({ tier: 'datacenter', sessionId });

      expect(manager.getStats().activeSessions).toBe(1);

      manager.releaseSession(sessionId);

      expect(manager.getStats().activeSessions).toBe(0);
    });
  });

  describe('reportFailure', () => {
    it('should not throw', () => {
      expect(() => {
        manager.reportFailure('proxy-123', new Error('Connection failed'));
      }).not.toThrow();
    });
  });

  describe('cleanupSessions', () => {
    it('should cleanup expired sessions', async () => {
      // Create a session
      await manager.getProxy({ tier: 'datacenter', sessionId: 'old-session' });
      
      // Wait a small amount of time so the session ages
      await new Promise(resolve => setTimeout(resolve, 5));
      
      // Cleanup with 1ms max age (session is older than this)
      const cleaned = manager.cleanupSessions(1);

      expect(cleaned).toBe(1);
      expect(manager.getStats().activeSessions).toBe(0);
    });

    it('should not cleanup recent sessions', async () => {
      await manager.getProxy({ tier: 'datacenter', sessionId: 'recent-session' });
      
      // Cleanup with long max age
      const cleaned = manager.cleanupSessions(60000);

      expect(cleaned).toBe(0);
      expect(manager.getStats().activeSessions).toBe(1);
    });
  });

  describe('getStats', () => {
    it('should return provider and session info', async () => {
      await manager.getProxy({ tier: 'datacenter', sessionId: 'stats-session' });

      const stats = manager.getStats();

      expect(stats.providers).toBeDefined();
      expect(Array.isArray(stats.providers)).toBe(true);
      expect(stats.activeSessions).toBe(1);
    });
  });
});

describe('Proxy Utilities', () => {
  describe('formatProxyForHttp', () => {
    it('should format proxy with auth', () => {
      const url = formatProxyForHttp(mockDatacenterProxy);

      expect(url).toContain('http://');
      expect(url).toContain('user');
      expect(url).toContain('pass');
      expect(url).toContain('8080');
    });

    it('should format proxy without auth', () => {
      const proxyNoAuth = {
        ...mockDatacenterProxy,
        username: undefined,
        password: undefined,
      };

      const url = formatProxyForHttp(proxyNoAuth);

      expect(url).toBe(`http://${proxyNoAuth.host}:${proxyNoAuth.port}`);
    });

    it('should URL encode special characters in credentials', () => {
      const proxySpecialChars = {
        ...mockDatacenterProxy,
        username: 'user@domain.com',
        password: 'pass:word!',
      };

      const url = formatProxyForHttp(proxySpecialChars);

      expect(url).toContain('%40'); // @ is encoded
      expect(url).toContain('%3A'); // : is encoded
      // Note: ! is not encoded by encodeURIComponent as it's unreserved in URLs
      expect(url).toContain('!');
    });
  });

  describe('formatProxyForPlaywright', () => {
    it('should return server and credentials', () => {
      const result = formatProxyForPlaywright(mockResidentialProxy);

      expect(result.server).toBe(`http://${mockResidentialProxy.host}:${mockResidentialProxy.port}`);
      expect(result.username).toBe(mockResidentialProxy.username);
      expect(result.password).toBe(mockResidentialProxy.password);
    });

    it('should handle proxy without credentials', () => {
      const proxyNoAuth = {
        ...mockDatacenterProxy,
        username: undefined,
        password: undefined,
      };

      const result = formatProxyForPlaywright(proxyNoAuth);

      expect(result.server).toBeDefined();
      expect(result.username).toBeUndefined();
      expect(result.password).toBeUndefined();
    });
  });

  describe('validateProxy', () => {
    it('should return valid status', async () => {
      const result = await validateProxy(mockDatacenterProxy);

      expect(result.valid).toBe(true);
      expect(result.latencyMs).toBeDefined();
    });
  });

  describe('getProxyManager', () => {
    it('should return singleton instance', () => {
      const manager1 = getProxyManager();
      const manager2 = getProxyManager();

      expect(manager1).toBe(manager2);
    });
  });
});
