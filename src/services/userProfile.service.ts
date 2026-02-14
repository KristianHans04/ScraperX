import crypto from 'crypto';
import { userRepository } from '../db/repositories/user.repository.js';
import { userPreferencesRepository } from '../db/repositories/userPreferences.repository.js';
import { notificationService } from './notification.service.js';
import type {
  UserProfileUpdateRequest,
  EmailChangeRequest,
  PasswordChangeRequest,
  AppearanceSettings,
  User,
  UserSession,
} from '../types/index.js';
import bcrypt from 'bcrypt';

export class UserProfileService {
  async updateProfile(userId: string, data: UserProfileUpdateRequest): Promise<void> {
    if (data.name !== undefined) {
      if (!data.name || data.name.trim().length === 0) {
        throw new Error('Name cannot be empty');
      }
      if (data.name.length > 100) {
        throw new Error('Name must be 100 characters or less');
      }
    }

    if (data.timezone !== undefined) {
      const validTimezones = Intl.supportedValuesOf('timeZone');
      if (!validTimezones.includes(data.timezone)) {
        throw new Error('Invalid timezone');
      }
    }

    if (data.dateFormat !== undefined) {
      const validFormats = ['YYYY-MM-DD', 'DD/MM/YYYY', 'MM/DD/YYYY'];
      if (!validFormats.includes(data.dateFormat)) {
        throw new Error('Invalid date format');
      }
    }

    await userPreferencesRepository.updateProfile(userId, data);
  }

  async updateAppearance(userId: string, settings: AppearanceSettings): Promise<void> {
    const validThemes = ['light', 'dark', 'system'];
    const validDensities = ['comfortable', 'compact'];

    if (!validThemes.includes(settings.theme)) {
      throw new Error('Invalid theme');
    }

    if (!validDensities.includes(settings.displayDensity)) {
      throw new Error('Invalid display density');
    }

    await userPreferencesRepository.updateAppearance(userId, settings);
  }

  async initiateEmailChange(
    userId: string,
    data: EmailChangeRequest
  ): Promise<string> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!data.newEmail || !data.newEmail.includes('@')) {
      throw new Error('Invalid email address');
    }

    const newEmailLower = data.newEmail.toLowerCase().trim();

    if (user.email.toLowerCase() === newEmailLower) {
      throw new Error('New email is the same as current email');
    }

    const existingUser = await userRepository.findByEmail(newEmailLower);
    if (existingUser) {
      throw new Error('Email address is already in use');
    }

    if (!user.passwordHash) {
      throw new Error('Cannot verify password: User has no password set');
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new Error('Invalid password');
    }

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    await userPreferencesRepository.createEmailChangeToken({
      userId,
      oldEmail: user.email,
      newEmail: newEmailLower,
      token,
      expiresAt,
    });

    return token;
  }

  async verifyEmailChange(token: string): Promise<void> {
    const emailChangeToken = await userPreferencesRepository.findEmailChangeToken(token);

    if (!emailChangeToken) {
      throw new Error('Invalid or expired verification token');
    }

    const existingUser = await userRepository.findByEmail(emailChangeToken.newEmail);
    if (existingUser && existingUser.id !== emailChangeToken.userId) {
      throw new Error('Email address is already in use');
    }

    await userRepository.updateEmail(emailChangeToken.userId, emailChangeToken.newEmail);

    await userPreferencesRepository.markEmailChangeTokenUsed(emailChangeToken.id);

    await notificationService.notifyEmailChanged(
      emailChangeToken.userId,
      emailChangeToken.newEmail
    );
  }

  async changePassword(userId: string, data: PasswordChangeRequest): Promise<void> {
    const user = await userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    if (!user.passwordHash) {
      throw new Error('Cannot change password: User has no password set');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      data.currentPassword,
      user.passwordHash
    );

    if (!isCurrentPasswordValid) {
      throw new Error('Current password is incorrect');
    }

    if (data.newPassword.length < 8) {
      throw new Error('Password must be at least 8 characters');
    }

    if (data.newPassword === data.currentPassword) {
      throw new Error('New password must be different from current password');
    }

    const hasUpperCase = /[A-Z]/.test(data.newPassword);
    const hasLowerCase = /[a-z]/.test(data.newPassword);
    const hasNumber = /[0-9]/.test(data.newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      throw new Error(
        'Password must contain uppercase, lowercase, and numeric characters'
      );
    }

    const newPasswordHash = await bcrypt.hash(data.newPassword, 10);

    await userRepository.updatePassword(userId, newPasswordHash);

    await userPreferencesRepository.revokeAllUserSessions(userId);

    await notificationService.notifyPasswordChanged(userId);
  }

  async uploadAvatar(userId: string, avatarUrl: string): Promise<void> {
    if (!avatarUrl || !avatarUrl.startsWith('http')) {
      throw new Error('Invalid avatar URL');
    }

    if (avatarUrl.length > 500) {
      throw new Error('Avatar URL too long');
    }

    await userPreferencesRepository.updateAvatar(userId, avatarUrl);
  }

  async deleteAvatar(userId: string): Promise<void> {
    await userPreferencesRepository.deleteAvatar(userId);
  }

  async getSessions(userId: string): Promise<UserSession[]> {
    return await userPreferencesRepository.getUserSessions(userId);
  }

  async revokeSession(sessionId: string, userId: string): Promise<void> {
    const sessions = await userPreferencesRepository.getUserSessions(userId);
    const session = sessions.find((s) => s.id === sessionId);

    if (!session) {
      throw new Error('Session not found or unauthorized');
    }

    await userPreferencesRepository.revokeSession(sessionId);
  }

  async revokeAllOtherSessions(userId: string, currentSessionId?: string): Promise<number> {
    return await userPreferencesRepository.revokeAllUserSessions(userId, currentSessionId);
  }
}

export const userProfileService = new UserProfileService();
