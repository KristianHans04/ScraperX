/**
 * Unit tests for Notification Service (Phase 9)
 * 
 * Coverage: Notification creation, preferences, categorization, helper methods
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock dependencies
vi.mock('../../../src/db/repositories/notification.repository.js', () => ({
  notificationRepository: {
    create: vi.fn(),
    findByUserId: vi.fn(),
    findByUserIdPaginated: vi.fn(),
    getUnreadCount: vi.fn(),
    markAsRead: vi.fn(),
    markAllAsRead: vi.fn(),
    deleteById: vi.fn(),
    deleteOldNotifications: vi.fn(),
    findById: vi.fn(),
  },
}));

vi.mock('../../../src/db/repositories/userPreferences.repository.js', () => ({
  userPreferencesRepository: {
    getNotificationPreference: vi.fn(),
    getNotificationPreferences: vi.fn(),
    initializeDefaultPreferences: vi.fn(),
    updateNotificationPreference: vi.fn(),
  },
}));

import { notificationService } from '../../../src/services/notification.service.js';
import { notificationRepository } from '../../../src/db/repositories/notification.repository.js';
import { userPreferencesRepository } from '../../../src/db/repositories/userPreferences.repository.js';

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createNotification', () => {
    it('should create notification when in-app is enabled', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'support',
        inAppEnabled: true,
        emailEnabled: true,
      } as any);
      
      vi.mocked(notificationRepository.create).mockResolvedValue({
        id: 'notif-123',
        userId: 'user-123',
        type: 'support_reply',
      } as any);
      
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'support_reply',
        title: 'Test Notification',
        message: 'Test message',
      });
      
      expect(result).not.toBeNull();
      expect(notificationRepository.create).toHaveBeenCalled();
    });

    it('should not create notification when in-app is disabled', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'support',
        inAppEnabled: false,
        emailEnabled: true,
      } as any);
      
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'support_reply',
        title: 'Test Notification',
        message: 'Test message',
      });
      
      expect(result).toBeNull();
      expect(notificationRepository.create).not.toHaveBeenCalled();
    });

    it('should create notification when no preferences exist', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue(null);
      vi.mocked(notificationRepository.create).mockResolvedValue({
        id: 'notif-123',
      } as any);
      
      const result = await notificationService.createNotification({
        userId: 'user-123',
        type: 'support_reply',
        title: 'Test Notification',
        message: 'Test message',
      });
      
      expect(result).not.toBeNull();
    });

    it('should correctly categorize support notifications', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'support',
        inAppEnabled: true,
      } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'support_reply',
        title: 'Test',
        message: 'Test',
      });
      
      expect(userPreferencesRepository.getNotificationPreference).toHaveBeenCalledWith('user-123', 'support');
    });

    it('should correctly categorize billing notifications', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'billing',
        inAppEnabled: true,
      } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'billing_payment_success',
        title: 'Test',
        message: 'Test',
      });
      
      expect(userPreferencesRepository.getNotificationPreference).toHaveBeenCalledWith('user-123', 'billing');
    });

    it('should correctly categorize security notifications', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'security',
        inAppEnabled: true,
      } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'security_password_changed',
        title: 'Test',
        message: 'Test',
      });
      
      expect(userPreferencesRepository.getNotificationPreference).toHaveBeenCalledWith('user-123', 'security');
    });

    it('should correctly categorize system notifications', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        category: 'system',
        inAppEnabled: true,
      } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'system_maintenance',
        title: 'Test',
        message: 'Test',
      });
      
      expect(userPreferencesRepository.getNotificationPreference).toHaveBeenCalledWith('user-123', 'system');
    });

    it('should include all provided data in notification', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({
        inAppEnabled: true,
      } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.createNotification({
        userId: 'user-123',
        type: 'support_reply',
        priority: 'high',
        title: 'Support Reply',
        message: 'You have a new reply',
        actionUrl: '/support/ticket-123',
        actionText: 'View Ticket',
        metadata: { ticketId: 'ticket-123' },
      });
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'support_reply',
        priority: 'high',
        title: 'Support Reply',
        message: 'You have a new reply',
        actionUrl: '/support/ticket-123',
        actionText: 'View Ticket',
        metadata: { ticketId: 'ticket-123' },
      }));
    });
  });

  describe('getNotifications', () => {
    it('should return paginated notifications', async () => {
      const mockResult = {
        data: [{ id: 'notif-1' }, { id: 'notif-2' }],
        pagination: { page: 1, limit: 10, total: 2 },
      };
      vi.mocked(notificationRepository.findByUserIdPaginated).mockResolvedValue(mockResult as any);
      
      const result = await notificationService.getNotifications('user-123', { page: 1, limit: 10 });
      
      expect(result).toEqual(mockResult);
      expect(notificationRepository.findByUserIdPaginated).toHaveBeenCalledWith('user-123', { page: 1, limit: 10 });
    });
  });

  describe('getRecentNotifications', () => {
    it('should return recent notifications with default limit', async () => {
      const mockNotifications = [{ id: 'notif-1' }, { id: 'notif-2' }];
      vi.mocked(notificationRepository.findByUserId).mockResolvedValue(mockNotifications as any);
      
      const result = await notificationService.getRecentNotifications('user-123');
      
      expect(result).toEqual(mockNotifications);
      expect(notificationRepository.findByUserId).toHaveBeenCalledWith('user-123', { limit: 10 });
    });

    it('should return recent notifications with custom limit', async () => {
      const mockNotifications = [{ id: 'notif-1' }];
      vi.mocked(notificationRepository.findByUserId).mockResolvedValue(mockNotifications as any);
      
      const result = await notificationService.getRecentNotifications('user-123', 5);
      
      expect(result).toEqual(mockNotifications);
      expect(notificationRepository.findByUserId).toHaveBeenCalledWith('user-123', { limit: 5 });
    });
  });

  describe('getUnreadNotifications', () => {
    it('should return unread notifications only', async () => {
      const mockNotifications = [{ id: 'notif-1' }];
      vi.mocked(notificationRepository.findByUserId).mockResolvedValue(mockNotifications as any);
      
      const result = await notificationService.getUnreadNotifications('user-123');
      
      expect(result).toEqual(mockNotifications);
      expect(notificationRepository.findByUserId).toHaveBeenCalledWith('user-123', { unreadOnly: true });
    });
  });

  describe('getUnreadCount', () => {
    it('should return unread count', async () => {
      vi.mocked(notificationRepository.getUnreadCount).mockResolvedValue(5);
      
      const result = await notificationService.getUnreadCount('user-123');
      
      expect(result).toBe(5);
      expect(notificationRepository.getUnreadCount).toHaveBeenCalledWith('user-123');
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue({
        id: 'notif-123',
        userId: 'user-123',
      } as any);
      vi.mocked(notificationRepository.markAsRead).mockResolvedValue(undefined);
      
      await notificationService.markAsRead('notif-123', 'user-123');
      
      expect(notificationRepository.markAsRead).toHaveBeenCalledWith('notif-123');
    });

    it('should throw error if notification not found', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue(null);
      
      await expect(notificationService.markAsRead('notif-123', 'user-123'))
        .rejects.toThrow('Notification not found or unauthorized');
    });

    it('should throw error if notification belongs to different user', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue({
        id: 'notif-123',
        userId: 'user-456',
      } as any);
      
      await expect(notificationService.markAsRead('notif-123', 'user-123'))
        .rejects.toThrow('Notification not found or unauthorized');
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', async () => {
      vi.mocked(notificationRepository.markAllAsRead).mockResolvedValue(5);
      
      const result = await notificationService.markAllAsRead('user-123');
      
      expect(result).toBe(5);
      expect(notificationRepository.markAllAsRead).toHaveBeenCalledWith('user-123');
    });
  });

  describe('deleteNotification', () => {
    it('should delete notification', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue({
        id: 'notif-123',
        userId: 'user-123',
      } as any);
      vi.mocked(notificationRepository.deleteById).mockResolvedValue(undefined);
      
      await notificationService.deleteNotification('notif-123', 'user-123');
      
      expect(notificationRepository.deleteById).toHaveBeenCalledWith('notif-123');
    });

    it('should throw error if notification not found', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue(null);
      
      await expect(notificationService.deleteNotification('notif-123', 'user-123'))
        .rejects.toThrow('Notification not found or unauthorized');
    });

    it('should throw error if notification belongs to different user', async () => {
      vi.mocked(notificationRepository.findById).mockResolvedValue({
        id: 'notif-123',
        userId: 'user-456',
      } as any);
      
      await expect(notificationService.deleteNotification('notif-123', 'user-123'))
        .rejects.toThrow('Notification not found or unauthorized');
    });
  });

  describe('cleanupOldNotifications', () => {
    it('should cleanup notifications with default 90 days', async () => {
      vi.mocked(notificationRepository.deleteOldNotifications).mockResolvedValue(10);
      
      const result = await notificationService.cleanupOldNotifications();
      
      expect(result).toBe(10);
      expect(notificationRepository.deleteOldNotifications).toHaveBeenCalledWith(90);
    });

    it('should cleanup notifications with custom days', async () => {
      vi.mocked(notificationRepository.deleteOldNotifications).mockResolvedValue(5);
      
      const result = await notificationService.cleanupOldNotifications(30);
      
      expect(result).toBe(5);
      expect(notificationRepository.deleteOldNotifications).toHaveBeenCalledWith(30);
    });
  });

  describe('getPreferences', () => {
    it('should return existing preferences', async () => {
      const mockPreferences = [
        { category: 'support', emailEnabled: true, inAppEnabled: true },
        { category: 'billing', emailEnabled: true, inAppEnabled: false },
      ];
      vi.mocked(userPreferencesRepository.getNotificationPreferences).mockResolvedValue(mockPreferences as any);
      
      const result = await notificationService.getPreferences('user-123');
      
      expect(result).toEqual(mockPreferences);
    });

    it('should initialize default preferences if none exist', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreferences).mockResolvedValue([]);
      vi.mocked(userPreferencesRepository.initializeDefaultPreferences).mockResolvedValue(undefined);
      
      const mockDefaultPrefs = [
        { category: 'support', emailEnabled: true, inAppEnabled: true },
      ];
      vi.mocked(userPreferencesRepository.getNotificationPreferences).mockResolvedValueOnce([]).mockResolvedValueOnce(mockDefaultPrefs as any);
      
      const result = await notificationService.getPreferences('user-123');
      
      expect(userPreferencesRepository.initializeDefaultPreferences).toHaveBeenCalledWith('user-123');
    });
  });

  describe('updatePreference', () => {
    it('should update notification preference', async () => {
      const mockPreference = {
        category: 'support',
        emailEnabled: false,
        inAppEnabled: true,
      };
      vi.mocked(userPreferencesRepository.updateNotificationPreference).mockResolvedValue(mockPreference as any);
      
      const result = await notificationService.updatePreference('user-123', 'support', false, true);
      
      expect(result).toEqual(mockPreference);
      expect(userPreferencesRepository.updateNotificationPreference).toHaveBeenCalledWith('user-123', 'support', false, true);
    });
  });

  describe('Notification Helper Methods', () => {
    it('should create support reply notification for staff reply', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifySupportReply('user-123', 'TKT-123', true);
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'support_reply',
        title: 'Support ticket updated',
        message: expect.stringContaining('staff'),
      }));
    });

    it('should create support reply notification for user reply', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifySupportReply('user-123', 'TKT-123', false);
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'support_reply',
        title: 'New reply on your support ticket',
        message: expect.stringContaining('TKT-123'),
      }));
    });

    it('should create support resolved notification', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifySupportResolved('user-123', 'TKT-123');
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'support_resolved',
        title: 'Support ticket resolved',
        priority: 'normal',
      }));
    });

    it('should create password changed notification with high priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyPasswordChanged('user-123');
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'security_password_changed',
        priority: 'high',
        actionUrl: '/settings/security',
      }));
    });

    it('should create email changed notification with high priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyEmailChanged('user-123', 'new@example.com');
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'security_email_changed',
        priority: 'high',
        message: expect.stringContaining('new@example.com'),
      }));
    });

    it('should create MFA enabled notification with high priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyMFAEnabled('user-123');
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'security_mfa_enabled',
        priority: 'high',
        title: 'Two-factor authentication enabled',
      }));
    });

    it('should create MFA disabled notification with high priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyMFADisabled('user-123');
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'security_mfa_disabled',
        priority: 'high',
        title: 'Two-factor authentication disabled',
      }));
    });

    it('should create credit low notification with high priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyCreditLow('user-123', 50);
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'billing_credit_low',
        priority: 'high',
        message: expect.stringContaining('50'),
        metadata: { balance: 50 },
      }));
    });

    it('should create payment success notification', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyPaymentSuccess('user-123', 29.99, 1000);
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'billing_payment_success',
        priority: 'normal',
        message: expect.stringContaining('$29.99'),
        metadata: { amount: 29.99, credits: 1000 },
      }));
    });

    it('should create payment failed notification with urgent priority', async () => {
      vi.mocked(userPreferencesRepository.getNotificationPreference).mockResolvedValue({ inAppEnabled: true } as any);
      vi.mocked(notificationRepository.create).mockResolvedValue({} as any);
      
      await notificationService.notifyPaymentFailed('user-123', 29.99);
      
      expect(notificationRepository.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-123',
        type: 'billing_payment_failed',
        priority: 'urgent',
        title: 'Payment failed',
        actionUrl: '/billing/payment-methods',
      }));
    });
  });
});
