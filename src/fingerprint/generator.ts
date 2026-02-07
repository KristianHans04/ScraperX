import { randomBytes, createHash } from 'crypto';
import { logger } from '../utils/logger.js';
import type { BrowserFingerprint, NavigatorFingerprint, ScreenFingerprint, WebGLFingerprint } from '../types/index.js';

// Common screen resolutions
const SCREEN_RESOLUTIONS: ScreenFingerprint[] = [
  { width: 1920, height: 1080, availWidth: 1920, availHeight: 1040, colorDepth: 24, pixelRatio: 1 },
  { width: 1366, height: 768, availWidth: 1366, availHeight: 728, colorDepth: 24, pixelRatio: 1 },
  { width: 1536, height: 864, availWidth: 1536, availHeight: 824, colorDepth: 24, pixelRatio: 1.25 },
  { width: 1440, height: 900, availWidth: 1440, availHeight: 860, colorDepth: 24, pixelRatio: 2 },
  { width: 1280, height: 720, availWidth: 1280, availHeight: 680, colorDepth: 24, pixelRatio: 1 },
  { width: 2560, height: 1440, availWidth: 2560, availHeight: 1400, colorDepth: 24, pixelRatio: 1 },
  { width: 3840, height: 2160, availWidth: 3840, availHeight: 2120, colorDepth: 24, pixelRatio: 1 },
  { width: 1600, height: 900, availWidth: 1600, availHeight: 860, colorDepth: 24, pixelRatio: 1 },
];

// Mobile screen resolutions
const MOBILE_SCREEN_RESOLUTIONS: ScreenFingerprint[] = [
  { width: 375, height: 812, availWidth: 375, availHeight: 812, colorDepth: 32, pixelRatio: 3 }, // iPhone X
  { width: 390, height: 844, availWidth: 390, availHeight: 844, colorDepth: 32, pixelRatio: 3 }, // iPhone 12
  { width: 412, height: 915, availWidth: 412, availHeight: 915, colorDepth: 24, pixelRatio: 2.625 }, // Pixel 6
  { width: 360, height: 800, availWidth: 360, availHeight: 800, colorDepth: 24, pixelRatio: 3 }, // Samsung Galaxy
  { width: 414, height: 896, availWidth: 414, availHeight: 896, colorDepth: 32, pixelRatio: 2 }, // iPhone 11
];

// Common user agents by platform
const USER_AGENTS = {
  windows: [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0',
  ],
  macos: [
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Safari/605.1.15',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:121.0) Gecko/20100101 Firefox/121.0',
  ],
  linux: [
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Mozilla/5.0 (X11; Ubuntu; Linux x86_64; rv:121.0) Gecko/20100101 Firefox/121.0',
    'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36',
  ],
  android: [
    'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 13; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
    'Mozilla/5.0 (Linux; Android 14; SM-G991B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36',
  ],
  ios: [
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.1.2 Mobile/15E148 Safari/604.1',
    'Mozilla/5.0 (iPad; CPU OS 17_2_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
  ],
};

// WebGL vendors and renderers
const WEBGL_CONFIGS: WebGLFingerprint[] = [
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 3080 Direct3D11 vs_5_0 ps_5_0, D3D11)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)' },
  { vendor: 'Google Inc. (NVIDIA)', renderer: 'ANGLE (NVIDIA, NVIDIA GeForce RTX 4090 Direct3D11 vs_5_0 ps_5_0, D3D11)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)' },
  { vendor: 'Google Inc. (AMD)', renderer: 'ANGLE (AMD, AMD Radeon RX 6800 XT Direct3D11 vs_5_0 ps_5_0, D3D11)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)' },
  { vendor: 'Google Inc. (Intel)', renderer: 'ANGLE (Intel, Intel(R) UHD Graphics 630 Direct3D11 vs_5_0 ps_5_0, D3D11)', version: 'WebGL 2.0 (OpenGL ES 3.0 Chromium)' },
  { vendor: 'Apple Inc.', renderer: 'Apple M1 Pro', version: 'WebGL 2.0 (OpenGL ES 3.0)' },
  { vendor: 'Apple Inc.', renderer: 'Apple M2 Max', version: 'WebGL 2.0 (OpenGL ES 3.0)' },
];

// Timezones by region
const TIMEZONES: Record<string, string[]> = {
  US: ['America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles'],
  UK: ['Europe/London'],
  DE: ['Europe/Berlin'],
  FR: ['Europe/Paris'],
  JP: ['Asia/Tokyo'],
  CN: ['Asia/Shanghai'],
  AU: ['Australia/Sydney', 'Australia/Melbourne'],
  BR: ['America/Sao_Paulo'],
  IN: ['Asia/Kolkata'],
  default: ['America/New_York', 'Europe/London', 'Asia/Tokyo'],
};

// Languages by region
const LANGUAGES: Record<string, { primary: string; list: string[] }> = {
  US: { primary: 'en-US', list: ['en-US', 'en'] },
  UK: { primary: 'en-GB', list: ['en-GB', 'en'] },
  DE: { primary: 'de-DE', list: ['de-DE', 'de', 'en'] },
  FR: { primary: 'fr-FR', list: ['fr-FR', 'fr', 'en'] },
  JP: { primary: 'ja-JP', list: ['ja-JP', 'ja', 'en'] },
  CN: { primary: 'zh-CN', list: ['zh-CN', 'zh', 'en'] },
  BR: { primary: 'pt-BR', list: ['pt-BR', 'pt', 'en'] },
  default: { primary: 'en-US', list: ['en-US', 'en'] },
};

export interface FingerprintOptions {
  platform?: 'windows' | 'macos' | 'linux' | 'android' | 'ios';
  country?: string;
  mobile?: boolean;
  seed?: string;
}

/**
 * Generate a consistent browser fingerprint
 */
export function generateFingerprint(options: FingerprintOptions = {}): BrowserFingerprint {
  const { platform = 'windows', country = 'US', mobile = false, seed } = options;

  // Create deterministic randomness if seed provided
  const random = seed 
    ? createSeededRandom(seed)
    : () => Math.random();

  // Select user agent
  const effectivePlatform = mobile ? (platform === 'macos' ? 'ios' : 'android') : platform;
  const userAgents = USER_AGENTS[effectivePlatform] || USER_AGENTS.windows;
  const userAgent = userAgents[Math.floor(random() * userAgents.length)];

  // Select screen resolution
  const screens = mobile ? MOBILE_SCREEN_RESOLUTIONS : SCREEN_RESOLUTIONS;
  const screen = screens[Math.floor(random() * screens.length)];

  // Select WebGL config
  const webgl = WEBGL_CONFIGS[Math.floor(random() * WEBGL_CONFIGS.length)];

  // Select timezone
  const timezones = TIMEZONES[country] || TIMEZONES.default;
  const timezone = timezones[Math.floor(random() * timezones.length)];

  // Select language
  const languageConfig = LANGUAGES[country] || LANGUAGES.default;

  // Generate navigator fingerprint
  const navigator = generateNavigatorFingerprint(effectivePlatform, languageConfig, random);

  // Generate noise seeds
  const canvasNoiseSeed = randomBytes(16).toString('hex');
  const audioNoiseSeed = randomBytes(16).toString('hex');

  // Generate ID
  const id = createHash('sha256')
    .update(`${userAgent}${JSON.stringify(screen)}${timezone}${Date.now()}`)
    .digest('hex')
    .slice(0, 16);

  // Generate headers
  const headers = generateHeaders(userAgent, languageConfig);

  const fingerprint: BrowserFingerprint = {
    id,
    userAgent,
    navigator,
    screen,
    webgl,
    headers,
    canvasNoiseSeed,
    audioNoiseSeed,
    timezone,
    locale: languageConfig.primary,
  };

  logger.debug({ fingerprintId: id, platform: effectivePlatform, country }, 'Fingerprint generated');

  return fingerprint;
}

/**
 * Generate navigator fingerprint
 */
function generateNavigatorFingerprint(
  platform: string,
  languageConfig: { primary: string; list: string[] },
  random: () => number
): NavigatorFingerprint {
  const platformMap: Record<string, { platform: string; vendor: string }> = {
    windows: { platform: 'Win32', vendor: 'Google Inc.' },
    macos: { platform: 'MacIntel', vendor: 'Apple Computer, Inc.' },
    linux: { platform: 'Linux x86_64', vendor: 'Google Inc.' },
    android: { platform: 'Linux armv8l', vendor: 'Google Inc.' },
    ios: { platform: 'iPhone', vendor: 'Apple Computer, Inc.' },
  };

  const config = platformMap[platform] || platformMap.windows;
  const isMobile = platform === 'android' || platform === 'ios';

  return {
    platform: config.platform,
    language: languageConfig.primary,
    languages: languageConfig.list,
    hardwareConcurrency: isMobile 
      ? [4, 6, 8][Math.floor(random() * 3)]
      : [4, 8, 12, 16][Math.floor(random() * 4)],
    deviceMemory: isMobile
      ? [4, 6, 8][Math.floor(random() * 3)]
      : [8, 16, 32][Math.floor(random() * 3)],
    maxTouchPoints: isMobile ? 5 : 0,
    vendor: config.vendor,
    appVersion: '5.0',
  };
}

/**
 * Generate request headers
 */
function generateHeaders(
  userAgent: string,
  languageConfig: { primary: string; list: string[] }
): Record<string, string> {
  return {
    'User-Agent': userAgent,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
    'Accept-Language': languageConfig.list.join(','),
    'Accept-Encoding': 'gzip, deflate, br',
    'Cache-Control': 'no-cache',
    'Pragma': 'no-cache',
    'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
    'Sec-Ch-Ua-Mobile': '?0',
    'Sec-Ch-Ua-Platform': '"Windows"',
    'Sec-Fetch-Dest': 'document',
    'Sec-Fetch-Mode': 'navigate',
    'Sec-Fetch-Site': 'none',
    'Sec-Fetch-User': '?1',
    'Upgrade-Insecure-Requests': '1',
  };
}

/**
 * Create seeded random function for deterministic fingerprints
 */
function createSeededRandom(seed: string): () => number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    const char = seed.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  
  let state = hash;
  
  return () => {
    state = (state * 1103515245 + 12345) & 0x7fffffff;
    return state / 0x7fffffff;
  };
}

/**
 * Generate a random fingerprint session ID
 */
export function generateFingerprintSessionId(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Create fingerprint for a specific session (deterministic)
 */
export function createSessionFingerprint(
  sessionId: string,
  options: Omit<FingerprintOptions, 'seed'> = {}
): BrowserFingerprint {
  return generateFingerprint({ ...options, seed: sessionId });
}

/**
 * Validate a fingerprint structure
 */
export function validateFingerprint(fingerprint: unknown): fingerprint is BrowserFingerprint {
  if (!fingerprint || typeof fingerprint !== 'object') return false;
  
  const fp = fingerprint as Record<string, unknown>;
  
  return (
    typeof fp.id === 'string' &&
    typeof fp.userAgent === 'string' &&
    typeof fp.navigator === 'object' &&
    typeof fp.screen === 'object' &&
    typeof fp.webgl === 'object' &&
    typeof fp.timezone === 'string' &&
    typeof fp.locale === 'string'
  );
}
