import { getRedisClient } from '../../queue/redis.js';
import { Redis } from 'ioredis';
import crypto from 'crypto';
import type { UserRoleType } from '../../types/index.js';

export interface Session {
  sessionId: string;
  userId: string;
  accountId: string;
  role: UserRoleType;
  ipAddress: string;
  userAgent: string;
  createdAt: Date;
  lastActivityAt: Date;
  expiresAt: Date;
  csrfToken: string;
}

interface SessionData {
  user_id: string;
  account_id: string;
  role: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
  csrf_token: string;
}

const SESSION_PREFIX = 'session:';
const USER_SESSIONS_PREFIX = 'user_sessions:';
const DEFAULT_IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes
const DEFAULT_ABSOLUTE_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours
const EXTENDED_IDLE_TIMEOUT = 7 * 24 * 60 * 60 * 1000; // 7 days
const EXTENDED_ABSOLUTE_TIMEOUT = 30 * 24 * 60 * 60 * 1000; // 30 days

export class SessionRepository {
  private redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  /**
   * Generate a cryptographically secure session ID
   */
  private generateSessionId(): string {
    return crypto.randomBytes(32).toString('hex'); // 64 characters
  }

  /**
   * Generate a CSRF token
   */
  private generateCsrfToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * Convert Redis hash to Session object
   */
  private hashToSession(sessionId: string, data: SessionData): Session {
    return {
      sessionId,
      userId: data.user_id,
      accountId: data.account_id,
      role: data.role as UserRoleType,
      ipAddress: data.ip_address,
      userAgent: data.user_agent,
      createdAt: new Date(data.created_at),
      lastActivityAt: new Date(data.last_activity_at),
      expiresAt: new Date(data.expires_at),
      csrfToken: data.csrf_token,
    };
  }

  /**
   * Create a new session
   */
  async create(data: {
    userId: string;
    accountId: string;
    role: UserRoleType;
    ipAddress: string;
    userAgent: string;
    rememberMe?: boolean;
  }): Promise<Session> {
    const sessionId = this.generateSessionId();
    const csrfToken = this.generateCsrfToken();
    const now = new Date();
    const idleTimeout = data.rememberMe ? EXTENDED_IDLE_TIMEOUT : DEFAULT_IDLE_TIMEOUT;
    const absoluteTimeout = data.rememberMe ? EXTENDED_ABSOLUTE_TIMEOUT : DEFAULT_ABSOLUTE_TIMEOUT;
    const expiresAt = new Date(now.getTime() + absoluteTimeout);

    const sessionData: SessionData = {
      user_id: data.userId,
      account_id: data.accountId,
      role: data.role,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      created_at: now.toISOString(),
      last_activity_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
      csrf_token: csrfToken,
    };

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${data.userId}`;

    // Store session in Redis as a hash
    await this.redis.hset(sessionKey, sessionData as any);
    
    // Set TTL to idle timeout initially (will be updated on activity)
    await this.redis.pexpire(sessionKey, idleTimeout);

    // Add session to user's session set
    await this.redis.sadd(userSessionsKey, sessionId);

    return this.hashToSession(sessionId, sessionData);
  }

  /**
   * Find a session by ID
   */
  async findById(sessionId: string): Promise<Session | null> {
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const data = await this.redis.hgetall(sessionKey) as any as SessionData;

    if (!data || !data.user_id) {
      return null;
    }

    const session = this.hashToSession(sessionId, data);

    // Check if session has expired (idle or absolute)
    const now = new Date();
    if (now > session.expiresAt) {
      await this.delete(sessionId);
      return null;
    }

    // Check idle timeout
    const idleTimeout = DEFAULT_IDLE_TIMEOUT;
    if (now.getTime() - session.lastActivityAt.getTime() > idleTimeout) {
      await this.delete(sessionId);
      return null;
    }

    return session;
  }

  /**
   * Update last activity timestamp
   * Throttled to once per minute to reduce Redis writes
   */
  async updateActivity(sessionId: string): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session) {
      return false;
    }

    const now = new Date();
    const timeSinceLastUpdate = now.getTime() - session.lastActivityAt.getTime();

    // Only update if more than 1 minute has passed
    if (timeSinceLastUpdate < 60 * 1000) {
      return true;
    }

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    await this.redis.hset(sessionKey, 'last_activity_at', now.toISOString());

    return true;
  }

  /**
   * Extend session expiry (used for "remember me" functionality)
   */
  async extend(sessionId: string, additionalMs: number): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session) {
      return false;
    }

    const newExpiresAt = new Date(session.expiresAt.getTime() + additionalMs);
    const sessionKey = `${SESSION_PREFIX}${sessionId}`;

    await this.redis.hset(sessionKey, 'expires_at', newExpiresAt.toISOString());
    await this.redis.pexpire(sessionKey, newExpiresAt.getTime() - Date.now());

    return true;
  }

  /**
   * Delete a session
   */
  async delete(sessionId: string): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session) {
      return false;
    }

    const sessionKey = `${SESSION_PREFIX}${sessionId}`;
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${session.userId}`;

    await this.redis.del(sessionKey);
    await this.redis.srem(userSessionsKey, sessionId);

    return true;
  }

  /**
   * Delete all sessions for a user
   */
  async deleteAllForUser(userId: string, exceptSessionId?: string): Promise<number> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);

    let deletedCount = 0;

    for (const sessionId of sessionIds) {
      if (exceptSessionId && sessionId === exceptSessionId) {
        continue;
      }
      const deleted = await this.delete(sessionId);
      if (deleted) {
        deletedCount++;
      }
    }

    return deletedCount;
  }

  /**
   * List all active sessions for a user
   */
  async listByUserId(userId: string): Promise<Session[]> {
    const userSessionsKey = `${USER_SESSIONS_PREFIX}${userId}`;
    const sessionIds = await this.redis.smembers(userSessionsKey);

    const sessions: Session[] = [];

    for (const sessionId of sessionIds) {
      const session = await this.findById(sessionId);
      if (session) {
        sessions.push(session);
      }
    }

    // Sort by creation time, newest first
    sessions.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    return sessions;
  }

  /**
   * Verify CSRF token
   */
  async verifyCsrfToken(sessionId: string, csrfToken: string): Promise<boolean> {
    const session = await this.findById(sessionId);
    if (!session) {
      return false;
    }

    // Use constant-time comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(session.csrfToken),
      Buffer.from(csrfToken)
    );
  }
}

/**
 * Create a session repository instance
 */
export async function createSessionRepository(): Promise<SessionRepository> {
  const redis = await getRedisClient();
  return new SessionRepository(redis);
}

let sessionRepository: SessionRepository | null = null;

/**
 * Get or create the session repository singleton
 */
export async function getSessionRepository(): Promise<SessionRepository> {
  if (!sessionRepository) {
    sessionRepository = await createSessionRepository();
  }
  return sessionRepository;
}
