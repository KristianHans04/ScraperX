import { createHash, randomBytes, timingSafeEqual } from 'crypto';
import bcrypt from 'bcrypt';
import { config } from '../config/index.js';
import { isCommonPassword } from './commonPasswords.js';

const BCRYPT_COST_FACTOR = 12;
const MIN_PASSWORD_LENGTH = 8;
const MAX_PASSWORD_LENGTH = 128;

/**
 * Validate password strength
 */
export function validatePassword(password: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (password.length < MIN_PASSWORD_LENGTH) {
    errors.push(`Password must be at least ${MIN_PASSWORD_LENGTH} characters long`);
  }

  if (password.length > MAX_PASSWORD_LENGTH) {
    errors.push(`Password must not exceed ${MAX_PASSWORD_LENGTH} characters`);
  }

  if (isCommonPassword(password)) {
    errors.push('Password is too common. Please choose a different password');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Hash a password for storage using bcrypt with cost factor 12
 */
export async function hashPassword(password: string): Promise<string> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    throw new Error('Password is too long');
  }
  return bcrypt.hash(password, BCRYPT_COST_FACTOR);
}

/**
 * Compare a password with its hash using constant-time comparison
 */
export async function comparePassword(password: string, hashedPassword: string): Promise<boolean> {
  if (password.length > MAX_PASSWORD_LENGTH) {
    return false;
  }
  return bcrypt.compare(password, hashedPassword);
}

/**
 * Generate a random API key and return both the key and its hash
 */
export function generateApiKey(): { key: string; hash: string } {
  const randomPart = randomBytes(config.apiKey.length).toString('hex').slice(0, config.apiKey.length);
  const key = `${config.apiKey.prefix}${randomPart}`;
  const hash = hashApiKey(key);
  return { key, hash };
}

/**
 * Extract prefix from API key
 */
export function extractApiKeyPrefix(apiKey: string): string {
  return apiKey.slice(0, 12);
}

/**
 * Hash an API key for storage
 */
export function hashApiKey(apiKey: string): string {
  return createHash('sha256').update(apiKey).digest('hex');
}

/**
 * Verify an API key against its hash
 */
export function verifyApiKey(apiKey: string, hash: string): boolean {
  const computedHash = hashApiKey(apiKey);
  const hashBuffer = Buffer.from(hash, 'hex');
  const computedBuffer = Buffer.from(computedHash, 'hex');
  
  if (hashBuffer.length !== computedBuffer.length) {
    return false;
  }
  
  return timingSafeEqual(hashBuffer, computedBuffer);
}

/**
 * Hash a URL for deduplication
 */
export function hashUrl(url: string): string {
  return createHash('sha256').update(url).digest('hex');
}

/**
 * Generate a unique job ID
 */
export function generateJobId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(8).toString('hex');
  return `job_${timestamp}${random}`;
}

/**
 * Generate a unique batch ID
 */
export function generateBatchId(): string {
  const timestamp = Date.now().toString(36);
  const random = randomBytes(6).toString('hex');
  return `batch_${timestamp}${random}`;
}

/**
 * Generate a random string
 */
export function generateRandomString(length: number): string {
  return randomBytes(Math.ceil(length / 2))
    .toString('hex')
    .slice(0, length);
}

/**
 * Hash content for deduplication
 */
export function hashContent(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}
