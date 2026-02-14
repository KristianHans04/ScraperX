import crypto from 'crypto';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs/promises';

export interface AvatarUploadResult {
  url: string;
  filename: string;
  size: number;
}

export class AvatarService {
  private readonly UPLOAD_DIR = process.env.AVATAR_UPLOAD_DIR || './uploads/avatars';
  private readonly MAX_SIZE_MB = 5;
  private readonly MAX_SIZE_BYTES = this.MAX_SIZE_MB * 1024 * 1024;
  private readonly ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  private readonly OUTPUT_SIZE = 200;

  constructor() {
    this.ensureUploadDir();
  }

  private async ensureUploadDir(): Promise<void> {
    try {
      await fs.access(this.UPLOAD_DIR);
    } catch {
      await fs.mkdir(this.UPLOAD_DIR, { recursive: true });
    }
  }

  async processAndSaveAvatar(
    buffer: Buffer,
    mimetype: string,
    originalFilename: string
  ): Promise<AvatarUploadResult> {
    if (!this.ALLOWED_TYPES.includes(mimetype)) {
      throw new Error(
        `Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`
      );
    }

    if (buffer.length > this.MAX_SIZE_BYTES) {
      throw new Error(`File too large. Maximum size: ${this.MAX_SIZE_MB}MB`);
    }

    const fileHash = crypto
      .createHash('sha256')
      .update(buffer)
      .digest('hex')
      .substring(0, 16);
    
    const timestamp = Date.now();
    const filename = `${timestamp}-${fileHash}.webp`;
    const filepath = path.join(this.UPLOAD_DIR, filename);

    const processedBuffer = await sharp(buffer)
      .resize(this.OUTPUT_SIZE, this.OUTPUT_SIZE, {
        fit: 'cover',
        position: 'center',
      })
      .webp({ quality: 85 })
      .toBuffer();

    await fs.writeFile(filepath, processedBuffer);

    const url = `/uploads/avatars/${filename}`;

    return {
      url,
      filename,
      size: processedBuffer.length,
    };
  }

  async deleteAvatar(url: string): Promise<void> {
    if (!url.startsWith('/uploads/avatars/')) {
      return;
    }

    const filename = path.basename(url);
    const filepath = path.join(this.UPLOAD_DIR, filename);

    try {
      await fs.unlink(filepath);
    } catch (error) {
      console.error('Failed to delete avatar file:', error);
    }
  }

  validateAvatarUpload(buffer: Buffer, mimetype: string): void {
    if (!this.ALLOWED_TYPES.includes(mimetype)) {
      throw new Error(
        `Invalid file type. Allowed types: ${this.ALLOWED_TYPES.join(', ')}`
      );
    }

    if (buffer.length > this.MAX_SIZE_BYTES) {
      throw new Error(`File too large. Maximum size: ${this.MAX_SIZE_MB}MB`);
    }
  }
}

export const avatarService = new AvatarService();
