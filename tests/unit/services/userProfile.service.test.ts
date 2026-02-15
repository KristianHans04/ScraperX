/**
 * Unit tests for User Profile Service (Phase 9)
 * 
 * Coverage: Profile validation, Email change, Password change, Avatar management, Sessions
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies before importing service
vi.mock('../../../src/db/repositories/user.repository.js', () => ({
  userRepository: {
    findById: vi.fn(),
    findByEmail: vi.fn(),
    updateEmail: vi.fn(),
    updatePassword: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/userPreferences.repository.js', () => ({
  userPreferencesRepository: {
    updateProfile: vi.fn(),
    updateAppearance: vi.fn(),
    createEmailChangeToken: vi.fn(),
    findEmailChangeToken: vi.fn(),
    markEmailChangeTokenUsed: vi.fn(),
    revokeAllUserSessions: vi.fn(),
    getUserSessions: vi.fn(),
    revokeSession: vi.fn(),
    updateAvatar: vi.fn(),
    deleteAvatar: vi.fn(),
  },
}));

vi.mock('../../../src/services/notification.service.js', () => ({
  notificationService: {
    notifyEmailChanged: vi.fn(),
    notifyPasswordChanged: vi.fn(),
  },
}));

vi.mock('bcrypt', () => ({
  default: {
    compare: vi.fn(),
    hash: vi.fn(),
  },
  compare: vi.fn(),
  hash: vi.fn(),
}));

import { userProfileService } from '../../../src/services/userProfile.service.js';
import { userRepository } from '../../../src/db/repositories/user.repository.js';
import { userPreferencesRepository } from '../../../src/db/repositories/userPreferences.repository.js';
import { notificationService } from '../../../src/services/notification.service.js';
import bcrypt from 'bcrypt';

describe('UserProfileService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('updateProfile', () => {
    it('should update profile with valid name', async () => {
      const userId = 'user-123';
      const data = { name: 'John Doe' };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should reject empty name', async () => {
      const userId = 'user-123';
      const data = { name: '' };
      
      await expect(userProfileService.updateProfile(userId, data)).rejects.toThrow('Name cannot be empty');
    });

    it('should reject whitespace-only name', async () => {
      const userId = 'user-123';
      const data = { name: '   ' };
      
      await expect(userProfileService.updateProfile(userId, data)).rejects.toThrow('Name cannot be empty');
    });

    it('should reject name exceeding 100 characters', async () => {
      const userId = 'user-123';
      const data = { name: 'a'.repeat(101) };
      
      await expect(userProfileService.updateProfile(userId, data)).rejects.toThrow('Name must be 100 characters or less');
    });

    it('should accept name at exactly 100 characters', async () => {
      const userId = 'user-123';
      const data = { name: 'a'.repeat(100) };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should accept valid IANA timezone', async () => {
      const userId = 'user-123';
      const data = { timezone: 'America/New_York' };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should reject invalid timezone', async () => {
      const userId = 'user-123';
      const data = { timezone: 'Invalid/Timezone' };
      
      await expect(userProfileService.updateProfile(userId, data)).rejects.toThrow('Invalid timezone');
    });

    it('should accept valid date format YYYY-MM-DD', async () => {
      const userId = 'user-123';
      const data = { dateFormat: 'YYYY-MM-DD' };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should accept valid date format DD/MM/YYYY', async () => {
      const userId = 'user-123';
      const data = { dateFormat: 'DD/MM/YYYY' };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should accept valid date format MM/DD/YYYY', async () => {
      const userId = 'user-123';
      const data = { dateFormat: 'MM/DD/YYYY' };
      
      await userProfileService.updateProfile(userId, data);
      
      expect(userPreferencesRepository.updateProfile).toHaveBeenCalledWith(userId, data);
    });

    it('should reject invalid date format', async () => {
      const userId = 'user-123';
      const data = { dateFormat: 'DD-MM-YYYY' };
      
      await expect(userProfileService.updateProfile(userId, data)).rejects.toThrow('Invalid date format');
    });
  });

  describe('updateAppearance', () => {
    it('should accept light theme', async () => {
      const userId = 'user-123';
      const settings = { theme: 'light', displayDensity: 'comfortable' };
      
      await userProfileService.updateAppearance(userId, settings);
      
      expect(userPreferencesRepository.updateAppearance).toHaveBeenCalledWith(userId, settings);
    });

    it('should accept dark theme', async () => {
      const userId = 'user-123';
      const settings = { theme: 'dark', displayDensity: 'comfortable' };
      
      await userProfileService.updateAppearance(userId, settings);
      
      expect(userPreferencesRepository.updateAppearance).toHaveBeenCalledWith(userId, settings);
    });

    it('should accept system theme', async () => {
      const userId = 'user-123';
      const settings = { theme: 'system', displayDensity: 'comfortable' };
      
      await userProfileService.updateAppearance(userId, settings);
      
      expect(userPreferencesRepository.updateAppearance).toHaveBeenCalledWith(userId, settings);
    });

    it('should reject invalid theme', async () => {
      const userId = 'user-123';
      const settings = { theme: 'blue', displayDensity: 'comfortable' };
      
      await expect(userProfileService.updateAppearance(userId, settings)).rejects.toThrow('Invalid theme');
    });

    it('should accept comfortable density', async () => {
      const userId = 'user-123';
      const settings = { theme: 'light', displayDensity: 'comfortable' };
      
      await userProfileService.updateAppearance(userId, settings);
      
      expect(userPreferencesRepository.updateAppearance).toHaveBeenCalledWith(userId, settings);
    });

    it('should accept compact density', async () => {
      const userId = 'user-123';
      const settings = { theme: 'light', displayDensity: 'compact' };
      
      await userProfileService.updateAppearance(userId, settings);
      
      expect(userPreferencesRepository.updateAppearance).toHaveBeenCalledWith(userId, settings);
    });

    it('should reject invalid display density', async () => {
      const userId = 'user-123';
      const settings = { theme: 'light', displayDensity: 'spacious' };
      
      await expect(userProfileService.updateAppearance(userId, settings)).rejects.toThrow('Invalid display density');
    });
  });

  describe('initiateEmailChange', () => {
    it('should throw error if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'new@example.com',
        password: 'password123'
      })).rejects.toThrow('User not found');
    });

    it('should throw error for invalid email format', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'invalid-email',
        password: 'password123'
      })).rejects.toThrow('Invalid email address');
    });

    it('should throw error if new email equals current email', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'user@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'user@example.com',
        password: 'password123'
      })).rejects.toThrow('New email is the same as current email');
    });

    it('should throw error if new email equals current email (case insensitive)', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'USER@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'user@EXAMPLE.com',
        password: 'password123'
      })).rejects.toThrow('New email is the same as current email');
    });

    it('should throw error if email already in use', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: 'user-456',
        email: 'new@example.com',
      } as any);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'new@example.com',
        password: 'password123'
      })).rejects.toThrow('Email address is already in use');
    });

    it('should throw error if user has no password', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: null,
      } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'new@example.com',
        password: 'password123'
      })).rejects.toThrow('Cannot verify password: User has no password set');
    });

    it('should throw error for invalid password', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
      
      await expect(userProfileService.initiateEmailChange('user-123', {
        newEmail: 'new@example.com',
        password: 'wrongpassword'
      })).rejects.toThrow('Invalid password');
    });

    it('should create email change token with valid data', async () => {
      const user = {
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashedpassword',
      };
      vi.mocked(userRepository.findById).mockResolvedValue(user as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      vi.mocked(userPreferencesRepository.createEmailChangeToken).mockResolvedValue(undefined);
      
      const token = await userProfileService.initiateEmailChange('user-123', {
        newEmail: 'new@example.com',
        password: 'correctpassword'
      });
      
      expect(token).toBeDefined();
      expect(token).toHaveLength(64); // 32 bytes hex encoded
      expect(userPreferencesRepository.createEmailChangeToken).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'user-123',
          oldEmail: 'old@example.com',
          newEmail: 'new@example.com',
          token: expect.any(String),
          expiresAt: expect.any(Date),
        })
      );
    });

    it('should trim and lowercase email', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        email: 'old@example.com',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await userProfileService.initiateEmailChange('user-123', {
        newEmail: '  NEW@Example.COM  ',
        password: 'correctpassword'
      });
      
      expect(userPreferencesRepository.createEmailChangeToken).toHaveBeenCalledWith(
        expect.objectContaining({
          newEmail: 'new@example.com',
        })
      );
    });
  });

  describe('verifyEmailChange', () => {
    it('should throw error for invalid token', async () => {
      vi.mocked(userPreferencesRepository.findEmailChangeToken).mockResolvedValue(null);
      
      await expect(userProfileService.verifyEmailChange('invalid-token')).rejects.toThrow('Invalid or expired verification token');
    });

    it('should throw error if email already in use by another user', async () => {
      vi.mocked(userPreferencesRepository.findEmailChangeToken).mockResolvedValue({
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
      } as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: 'user-456',
        email: 'new@example.com',
      } as any);
      
      await expect(userProfileService.verifyEmailChange('valid-token')).rejects.toThrow('Email address is already in use');
    });

    it('should update email and notify on successful verification', async () => {
      const tokenData = {
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
      };
      vi.mocked(userPreferencesRepository.findEmailChangeToken).mockResolvedValue(tokenData as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue(null);
      vi.mocked(userRepository.updateEmail).mockResolvedValue(undefined);
      vi.mocked(userPreferencesRepository.markEmailChangeTokenUsed).mockResolvedValue(undefined);
      
      await userProfileService.verifyEmailChange('valid-token');
      
      expect(userRepository.updateEmail).toHaveBeenCalledWith('user-123', 'new@example.com');
      expect(userPreferencesRepository.markEmailChangeTokenUsed).toHaveBeenCalledWith('token-123');
      expect(notificationService.notifyEmailChanged).toHaveBeenCalledWith('user-123', 'new@example.com');
    });

    it('should allow verification if email belongs to same user', async () => {
      const tokenData = {
        id: 'token-123',
        userId: 'user-123',
        newEmail: 'new@example.com',
      };
      vi.mocked(userPreferencesRepository.findEmailChangeToken).mockResolvedValue(tokenData as any);
      vi.mocked(userRepository.findByEmail).mockResolvedValue({
        id: 'user-123',
        email: 'new@example.com',
      } as any);
      
      await userProfileService.verifyEmailChange('valid-token');
      
      expect(userRepository.updateEmail).toHaveBeenCalledWith('user-123', 'new@example.com');
    });
  });

  describe('changePassword', () => {
    it('should throw error if user not found', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue(null);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpass',
        newPassword: 'NewPass123'
      })).rejects.toThrow('User not found');
    });

    it('should throw error if user has no password', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: null,
      } as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpass',
        newPassword: 'NewPass123'
      })).rejects.toThrow('Cannot change password: User has no password set');
    });

    it('should throw error for incorrect current password', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(false as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'wrongpass',
        newPassword: 'NewPass123'
      })).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for password shorter than 8 characters', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'Short1'
      })).rejects.toThrow('Password must be at least 8 characters');
    });

    it('should throw error if new password equals current password', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'SamePass123',
        newPassword: 'SamePass123'
      })).rejects.toThrow('New password must be different from current password');
    });

    it('should throw error for password without uppercase', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'password123'
      })).rejects.toThrow('Password must contain uppercase, lowercase, and numeric characters');
    });

    it('should throw error for password without lowercase', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'PASSWORD123'
      })).rejects.toThrow('Password must contain uppercase, lowercase, and numeric characters');
    });

    it('should throw error for password without numbers', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      
      await expect(userProfileService.changePassword('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'PasswordOnly'
      })).rejects.toThrow('Password must contain uppercase, lowercase, and numeric characters');
    });

    it('should successfully change password with valid requirements', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'oldhashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      vi.mocked(bcrypt.hash).mockResolvedValue('newhashedpassword' as any);
      
      await userProfileService.changePassword('user-123', {
        currentPassword: 'OldPassword123',
        newPassword: 'NewPassword123'
      });
      
      expect(bcrypt.hash).toHaveBeenCalledWith('NewPassword123', 10);
      expect(userRepository.updatePassword).toHaveBeenCalledWith('user-123', 'newhashedpassword');
      expect(userPreferencesRepository.revokeAllUserSessions).toHaveBeenCalledWith('user-123');
      expect(notificationService.notifyPasswordChanged).toHaveBeenCalledWith('user-123');
    });

    it('should accept password exactly 8 characters with all requirements', async () => {
      vi.mocked(userRepository.findById).mockResolvedValue({
        id: 'user-123',
        passwordHash: 'hashedpassword',
      } as any);
      vi.mocked(bcrypt.compare).mockResolvedValue(true as any);
      vi.mocked(bcrypt.hash).mockResolvedValue('newhash' as any);
      
      await userProfileService.changePassword('user-123', {
        currentPassword: 'oldpassword',
        newPassword: 'Pass1234'
      });
      
      expect(userRepository.updatePassword).toHaveBeenCalled();
    });
  });

  describe('uploadAvatar', () => {
    it('should throw error for invalid URL', async () => {
      await expect(userProfileService.uploadAvatar('user-123', '')).rejects.toThrow('Invalid avatar URL');
    });

    it('should throw error for non-HTTP URL', async () => {
      await expect(userProfileService.uploadAvatar('user-123', 'ftp://example.com/avatar.jpg')).rejects.toThrow('Invalid avatar URL');
    });

    it('should throw error for URL exceeding 500 characters', async () => {
      const longUrl = 'https://example.com/' + 'a'.repeat(500);
      await expect(userProfileService.uploadAvatar('user-123', longUrl)).rejects.toThrow('Avatar URL too long');
    });

    it('should successfully update avatar with valid URL', async () => {
      const validUrl = 'https://cdn.example.com/avatars/user-123.jpg';
      
      await userProfileService.uploadAvatar('user-123', validUrl);
      
      expect(userPreferencesRepository.updateAvatar).toHaveBeenCalledWith('user-123', validUrl);
    });

    it('should accept HTTPS URL', async () => {
      const validUrl = 'https://secure.example.com/avatar.png';
      
      await userProfileService.uploadAvatar('user-123', validUrl);
      
      expect(userPreferencesRepository.updateAvatar).toHaveBeenCalledWith('user-123', validUrl);
    });
  });

  describe('deleteAvatar', () => {
    it('should successfully delete avatar', async () => {
      await userProfileService.deleteAvatar('user-123');
      
      expect(userPreferencesRepository.deleteAvatar).toHaveBeenCalledWith('user-123');
    });
  });

  describe('getSessions', () => {
    it('should return user sessions', async () => {
      const mockSessions = [
        { id: 'session-1', userId: 'user-123', isCurrent: true },
        { id: 'session-2', userId: 'user-123', isCurrent: false },
      ];
      vi.mocked(userPreferencesRepository.getUserSessions).mockResolvedValue(mockSessions as any);
      
      const sessions = await userProfileService.getSessions('user-123');
      
      expect(sessions).toEqual(mockSessions);
      expect(userPreferencesRepository.getUserSessions).toHaveBeenCalledWith('user-123');
    });
  });

  describe('revokeSession', () => {
    it('should throw error for unauthorized session', async () => {
      vi.mocked(userPreferencesRepository.getUserSessions).mockResolvedValue([
        { id: 'session-1', userId: 'user-123' },
      ] as any);
      
      await expect(userProfileService.revokeSession('session-2', 'user-123')).rejects.toThrow('Session not found or unauthorized');
    });

    it('should successfully revoke authorized session', async () => {
      vi.mocked(userPreferencesRepository.getUserSessions).mockResolvedValue([
        { id: 'session-1', userId: 'user-123' },
        { id: 'session-2', userId: 'user-123' },
      ] as any);
      
      await userProfileService.revokeSession('session-2', 'user-123');
      
      expect(userPreferencesRepository.revokeSession).toHaveBeenCalledWith('session-2');
    });
  });

  describe('revokeAllOtherSessions', () => {
    it('should revoke all sessions except current', async () => {
      vi.mocked(userPreferencesRepository.revokeAllUserSessions).mockResolvedValue(3);
      
      const count = await userProfileService.revokeAllOtherSessions('user-123', 'current-session');
      
      expect(count).toBe(3);
      expect(userPreferencesRepository.revokeAllUserSessions).toHaveBeenCalledWith('user-123', 'current-session');
    });

    it('should revoke all sessions when no current session specified', async () => {
      vi.mocked(userPreferencesRepository.revokeAllUserSessions).mockResolvedValue(5);
      
      const count = await userProfileService.revokeAllOtherSessions('user-123');
      
      expect(count).toBe(5);
      expect(userPreferencesRepository.revokeAllUserSessions).toHaveBeenCalledWith('user-123', undefined);
    });
  });
});
