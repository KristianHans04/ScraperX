/**
 * Unit tests for Avatar Service (Phase 9)
 * 
 * Coverage: Image processing, validation, format conversion, file operations
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'fs/promises';

// Mock fs/promises
vi.mock('fs/promises', () => ({
  default: {
    access: vi.fn(),
    mkdir: vi.fn(),
    writeFile: vi.fn(),
    unlink: vi.fn(),
  },
  access: vi.fn(),
  mkdir: vi.fn(),
  writeFile: vi.fn(),
  unlink: vi.fn(),
}));

// Mock sharp with a factory that returns a new mock instance each time
const mockSharpInstance = {
  resize: vi.fn().mockReturnThis(),
  webp: vi.fn().mockReturnThis(),
  toBuffer: vi.fn().mockResolvedValue(Buffer.from('processed-image-data')),
};

vi.mock('sharp', () => ({
  default: vi.fn(() => mockSharpInstance),
}));

// Import after mocks
import { avatarService, AvatarService } from '../../../src/services/avatar.service.js';

describe('AvatarService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AVATAR_UPLOAD_DIR;
  });

  describe('processAndSaveAvatar', () => {
    const createMockImageBuffer = (size: number = 1024): Buffer => {
      return Buffer.alloc(size, 'mock-image-data');
    };

    it('should throw error for invalid file type', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'application/pdf';
      const filename = 'document.pdf';
      
      await expect(avatarService.processAndSaveAvatar(buffer, mimetype, filename))
        .rejects.toThrow('Invalid file type. Allowed types: image/jpeg, image/jpg, image/png, image/webp');
    });

    it('should throw error for GIF files', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/gif';
      const filename = 'animation.gif';
      
      await expect(avatarService.processAndSaveAvatar(buffer, mimetype, filename))
        .rejects.toThrow('Invalid file type');
    });

    it('should throw error for file exceeding 5MB', async () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      const mimetype = 'image/jpeg';
      const filename = 'large-image.jpg';
      
      await expect(avatarService.processAndSaveAvatar(buffer, mimetype, filename))
        .rejects.toThrow('File too large. Maximum size: 5MB');
    });

    it('should accept file at exactly 5MB', async () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // Exactly 5MB
      const mimetype = 'image/jpeg';
      const filename = 'exact-size.jpg';
      
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result).toBeDefined();
      expect(result.url).toMatch(/^\/uploads\/avatars\//);
    });

    it('should accept JPEG files', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpeg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result).toBeDefined();
      expect(result.filename).toMatch(/\.webp$/);
    });

    it('should accept JPG files', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result).toBeDefined();
      expect(result.filename).toMatch(/\.webp$/);
    });

    it('should accept PNG files', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/png';
      const filename = 'photo.png';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result).toBeDefined();
      expect(result.filename).toMatch(/\.webp$/);
    });

    it('should accept WebP files', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/webp';
      const filename = 'photo.webp';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result).toBeDefined();
      expect(result.filename).toMatch(/\.webp$/);
    });

    it('should generate unique filename with hash and timestamp', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpeg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      // Filename should contain timestamp (numeric) and hash (hex)
      expect(result.filename).toMatch(/^\d+-[a-f0-9]{16}\.webp$/);
    });

    it('should create upload directory if it does not exist', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpeg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      // Create a new instance since avatarService was already initialized
      const testService = new AvatarService();
      await testService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(fs.mkdir).toHaveBeenCalledWith('./uploads/avatars', { recursive: true });
    });

    it('should use custom upload directory from environment variable', async () => {
      process.env.AVATAR_UPLOAD_DIR = '/custom/upload/path';
      
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpeg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockRejectedValue(new Error('Directory does not exist'));
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const testService = new AvatarService();
      await testService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(fs.mkdir).toHaveBeenCalledWith('/custom/upload/path', { recursive: true });
    });

    it('should return processed image size', async () => {
      const buffer = createMockImageBuffer();
      const mimetype = 'image/jpeg';
      const filename = 'photo.jpg';
      
      vi.mocked(fs.access).mockResolvedValue(undefined);
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);
      
      const result = await avatarService.processAndSaveAvatar(buffer, mimetype, filename);
      
      expect(result.size).toBeDefined();
      expect(typeof result.size).toBe('number');
    });
  });

  describe('deleteAvatar', () => {
    it('should delete avatar file', async () => {
      const url = '/uploads/avatars/1234567890-abc123.webp';
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      
      await avatarService.deleteAvatar(url);
      
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('1234567890-abc123.webp'));
    });

    it('should silently return if file does not exist', async () => {
      const url = '/uploads/avatars/non-existent.webp';
      vi.mocked(fs.unlink).mockRejectedValue(new Error('File not found'));
      
      // Should not throw
      await expect(avatarService.deleteAvatar(url)).resolves.not.toThrow();
    });

    it('should not attempt to delete external URLs', async () => {
      const url = 'https://cdn.example.com/avatar.jpg';
      
      await avatarService.deleteAvatar(url);
      
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should not attempt to delete URLs outside uploads/avatars', async () => {
      const url = '/uploads/other/file.txt';
      
      await avatarService.deleteAvatar(url);
      
      expect(fs.unlink).not.toHaveBeenCalled();
    });

    it('should handle URL with query parameters', async () => {
      const url = '/uploads/avatars/1234567890-abc123.webp?v=123';
      vi.mocked(fs.unlink).mockResolvedValue(undefined);
      
      await avatarService.deleteAvatar(url);
      
      expect(fs.unlink).toHaveBeenCalledWith(expect.stringContaining('1234567890-abc123.webp'));
    });
  });

  describe('validateAvatarUpload', () => {
    it('should throw error for invalid file type', () => {
      const buffer = Buffer.from('mock-data');
      const mimetype = 'application/zip';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype))
        .toThrow('Invalid file type');
    });

    it('should throw error for oversized file', () => {
      const buffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      const mimetype = 'image/jpeg';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype))
        .toThrow('File too large');
    });

    it('should not throw for valid JPEG', () => {
      const buffer = Buffer.alloc(1024);
      const mimetype = 'image/jpeg';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype)).not.toThrow();
    });

    it('should not throw for valid PNG', () => {
      const buffer = Buffer.alloc(1024);
      const mimetype = 'image/png';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype)).not.toThrow();
    });

    it('should not throw for valid WebP', () => {
      const buffer = Buffer.alloc(1024);
      const mimetype = 'image/webp';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype)).not.toThrow();
    });

    it('should throw error for SVG files', () => {
      const buffer = Buffer.from('<svg></svg>');
      const mimetype = 'image/svg+xml';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype))
        .toThrow('Invalid file type');
    });

    it('should throw error for BMP files', () => {
      const buffer = Buffer.alloc(1024);
      const mimetype = 'image/bmp';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype))
        .toThrow('Invalid file type');
    });

    it('should accept file at exactly 5MB boundary', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024); // Exactly 5MB
      const mimetype = 'image/jpeg';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype)).not.toThrow();
    });

    it('should reject file just over 5MB', () => {
      const buffer = Buffer.alloc(5 * 1024 * 1024 + 1); // 5MB + 1 byte
      const mimetype = 'image/jpeg';
      
      expect(() => avatarService.validateAvatarUpload(buffer, mimetype))
        .toThrow('File too large');
    });
  });
});
