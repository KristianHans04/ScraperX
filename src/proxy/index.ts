import { config } from '../config/index.js';
import { logger } from '../utils/logger.js';
import { ProxyError, ProxyAuthenticationError } from '../utils/errors.js';
import type { ProxyConfig, ProxyTier } from '../types/index.js';

export interface ProxyProviderConfig {
  name: string;
  type: ProxyTier;
  url: string;
  username?: string;
  password?: string;
  countries?: string[];
  enabled: boolean;
  weight: number; // For load balancing
}

export interface ProxySession {
  id: string;
  proxy: ProxyConfig;
  createdAt: number;
  requestCount: number;
  lastUsedAt: number;
}

/**
 * Multi-provider Proxy Manager
 */
export class ProxyManager {
  private providers: Map<string, ProxyProviderConfig> = new Map();
  private sessions: Map<string, ProxySession> = new Map();
  private rotationIndex: Map<ProxyTier, number> = new Map();

  constructor() {
    this.initializeProviders();
  }

  /**
   * Initialize proxy providers from config
   */
  private initializeProviders(): void {
    // Add datacenter proxy provider
    if (config.proxy.datacenterUrl) {
      this.addProvider({
        name: 'datacenter-default',
        type: 'datacenter',
        url: config.proxy.datacenterUrl,
        enabled: config.proxy.enabled,
        weight: 1,
      });
    }

    // Add residential proxy provider
    if (config.proxy.residentialUrl) {
      this.addProvider({
        name: 'residential-default',
        type: 'residential',
        url: config.proxy.residentialUrl,
        enabled: config.proxy.enabled,
        weight: 1,
      });
    }

    // Add mobile proxy provider
    if (config.proxy.mobileUrl) {
      this.addProvider({
        name: 'mobile-default',
        type: 'mobile',
        url: config.proxy.mobileUrl,
        enabled: config.proxy.enabled,
        weight: 1,
      });
    }

    logger.info({ providerCount: this.providers.size }, 'Proxy providers initialized');
  }

  /**
   * Add a proxy provider
   */
  addProvider(providerConfig: ProxyProviderConfig): void {
    this.providers.set(providerConfig.name, providerConfig);
    logger.debug({ provider: providerConfig.name, type: providerConfig.type }, 'Proxy provider added');
  }

  /**
   * Remove a proxy provider
   */
  removeProvider(name: string): void {
    this.providers.delete(name);
    logger.debug({ provider: name }, 'Proxy provider removed');
  }

  /**
   * Get a proxy for a request
   */
  async getProxy(options: {
    tier: ProxyTier;
    country?: string;
    city?: string;
    sessionId?: string;
  }): Promise<ProxyConfig | null> {
    const { tier, country, city, sessionId } = options;

    // Check for existing session
    if (sessionId) {
      const session = this.sessions.get(sessionId);
      if (session && session.proxy.type === tier) {
        session.lastUsedAt = Date.now();
        session.requestCount++;
        logger.debug({ sessionId, proxyId: session.proxy.id }, 'Using existing proxy session');
        return session.proxy;
      }
    }

    // Find available providers for the tier
    const availableProviders = Array.from(this.providers.values())
      .filter(p => p.enabled && p.type === tier)
      .filter(p => !country || !p.countries || p.countries.includes(country));

    if (availableProviders.length === 0) {
      logger.warn({ tier, country }, 'No proxy providers available');
      return null;
    }

    // Select provider using weighted round-robin
    const provider = this.selectProvider(availableProviders, tier);

    // Parse proxy URL and create config
    const proxyConfig = this.parseProxyUrl(provider, country, city);

    // Create session if requested
    if (sessionId) {
      this.sessions.set(sessionId, {
        id: sessionId,
        proxy: proxyConfig,
        createdAt: Date.now(),
        requestCount: 1,
        lastUsedAt: Date.now(),
      });
      logger.debug({ sessionId, proxyId: proxyConfig.id }, 'New proxy session created');
    }

    return proxyConfig;
  }

  /**
   * Select provider using weighted round-robin
   */
  private selectProvider(providers: ProxyProviderConfig[], tier: ProxyTier): ProxyProviderConfig {
    // Calculate total weight
    const totalWeight = providers.reduce((sum, p) => sum + p.weight, 0);

    // Get current rotation index
    let index = this.rotationIndex.get(tier) || 0;

    // Find provider by weight
    let accumulatedWeight = 0;
    const targetWeight = index % totalWeight;

    for (const provider of providers) {
      accumulatedWeight += provider.weight;
      if (accumulatedWeight > targetWeight) {
        // Update rotation index
        this.rotationIndex.set(tier, index + 1);
        return provider;
      }
    }

    // Fallback to first provider
    this.rotationIndex.set(tier, index + 1);
    return providers[0];
  }

  /**
   * Parse proxy URL into ProxyConfig
   */
  private parseProxyUrl(
    provider: ProxyProviderConfig,
    country?: string,
    city?: string
  ): ProxyConfig {
    let proxyUrl = provider.url;

    // Replace placeholders for country/city targeting
    if (country) {
      proxyUrl = proxyUrl.replace('{country}', country.toLowerCase());
      proxyUrl = proxyUrl.replace('{COUNTRY}', country.toUpperCase());
    }
    if (city) {
      proxyUrl = proxyUrl.replace('{city}', city.toLowerCase());
    }

    // Replace session placeholder with unique ID
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    proxyUrl = proxyUrl.replace('{session}', sessionId);

    // Parse the URL
    const parsed = new URL(proxyUrl);

    return {
      id: `${provider.name}-${Date.now()}`,
      url: proxyUrl,
      protocol: parsed.protocol.replace(':', '') as 'http' | 'https' | 'socks5',
      host: parsed.hostname,
      port: parseInt(parsed.port || '80', 10),
      username: parsed.username || provider.username,
      password: parsed.password || provider.password,
      country,
      city,
      provider: provider.name,
      type: provider.type,
    };
  }

  /**
   * Release a proxy session
   */
  releaseSession(sessionId: string): void {
    this.sessions.delete(sessionId);
    logger.debug({ sessionId }, 'Proxy session released');
  }

  /**
   * Report proxy failure
   */
  reportFailure(proxyId: string, error: Error): void {
    logger.warn({ proxyId, error: error.message }, 'Proxy failure reported');
    // Could implement provider health tracking here
  }

  /**
   * Get provider stats
   */
  getStats(): {
    providers: { name: string; type: ProxyTier; enabled: boolean }[];
    activeSessions: number;
  } {
    return {
      providers: Array.from(this.providers.values()).map(p => ({
        name: p.name,
        type: p.type,
        enabled: p.enabled,
      })),
      activeSessions: this.sessions.size,
    };
  }

  /**
   * Cleanup expired sessions
   */
  cleanupSessions(maxAgeMs: number = 300000): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, session] of this.sessions.entries()) {
      if (now - session.lastUsedAt > maxAgeMs) {
        this.sessions.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      logger.debug({ cleaned }, 'Expired proxy sessions cleaned');
    }

    return cleaned;
  }
}

// Singleton instance
let proxyManager: ProxyManager | null = null;

/**
 * Get proxy manager instance
 */
export function getProxyManager(): ProxyManager {
  if (!proxyManager) {
    proxyManager = new ProxyManager();
  }
  return proxyManager;
}

/**
 * Format proxy for HTTP client
 */
export function formatProxyForHttp(proxy: ProxyConfig): string {
  let url = `${proxy.protocol}://`;
  
  if (proxy.username && proxy.password) {
    url += `${encodeURIComponent(proxy.username)}:${encodeURIComponent(proxy.password)}@`;
  }
  
  url += `${proxy.host}:${proxy.port}`;
  
  return url;
}

/**
 * Format proxy for Playwright
 */
export function formatProxyForPlaywright(proxy: ProxyConfig): {
  server: string;
  username?: string;
  password?: string;
} {
  return {
    server: `${proxy.protocol}://${proxy.host}:${proxy.port}`,
    username: proxy.username,
    password: proxy.password,
  };
}

/**
 * Validate proxy connectivity
 */
export async function validateProxy(proxy: ProxyConfig): Promise<{
  valid: boolean;
  latencyMs?: number;
  ip?: string;
  error?: string;
}> {
  // This would typically make a request through the proxy to an IP check service
  // For now, we just return success as a placeholder
  logger.debug({ proxyId: proxy.id }, 'Proxy validation placeholder');
  
  return {
    valid: true,
    latencyMs: 100,
  };
}
