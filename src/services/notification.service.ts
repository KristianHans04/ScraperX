import { notificationRepository } from '../db/repositories/notification.repository.js';
import { userPreferencesRepository } from '../db/repositories/userPreferences.repository.js';
import type {
  Notification,
  NotificationType,
  NotificationPriority,
  NotificationPreference,
  PaginatedResult,
  PaginationParams,
} from '../types/index.js';

export class NotificationService {
  async createNotification(data: {
    userId: string;
    type: NotificationType;
    priority?: NotificationPriority;
    title: string;
    message: string;
    actionUrl?: string;
    actionText?: string;
    metadata?: Record<string, unknown>;
  }): Promise<Notification> {
    const category = this.getCategoryFromType(data.type);
    
    const preferences = await userPreferencesRepository.getNotificationPreference(
      data.userId,
      category
    );

    if (preferences && !preferences.inAppEnabled) {
      return null;
    }

    return await notificationRepository.create(data);
  }

  async getNotifications(
    userId: string,
    pagination: PaginationParams
  ): Promise<PaginatedResult<Notification>> {
    return await notificationRepository.findByUserIdPaginated(userId, pagination);
  }

  async getRecentNotifications(
    userId: string,
    limit: number = 10
  ): Promise<Notification[]> {
    return await notificationRepository.findByUserId(userId, { limit });
  }

  async getUnreadNotifications(userId: string): Promise<Notification[]> {
    return await notificationRepository.findByUserId(userId, { unreadOnly: true });
  }

  async getUnreadCount(userId: string): Promise<number> {
    return await notificationRepository.getUnreadCount(userId);
  }

  async markAsRead(notificationId: string, userId: string): Promise<void> {
    const notification = await notificationRepository.findById(notificationId);
    
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    await notificationRepository.markAsRead(notificationId);
  }

  async markAllAsRead(userId: string): Promise<number> {
    return await notificationRepository.markAllAsRead(userId);
  }

  async deleteNotification(notificationId: string, userId: string): Promise<void> {
    const notification = await notificationRepository.findById(notificationId);
    
    if (!notification || notification.userId !== userId) {
      throw new Error('Notification not found or unauthorized');
    }

    await notificationRepository.deleteById(notificationId);
  }

  async cleanupOldNotifications(daysOld: number = 90): Promise<number> {
    return await notificationRepository.deleteOldNotifications(daysOld);
  }

  async getPreferences(userId: string): Promise<NotificationPreference[]> {
    const preferences = await userPreferencesRepository.getNotificationPreferences(userId);
    
    if (preferences.length === 0) {
      await userPreferencesRepository.initializeDefaultPreferences(userId);
      return await userPreferencesRepository.getNotificationPreferences(userId);
    }

    return preferences;
  }

  async updatePreference(
    userId: string,
    category: string,
    emailEnabled: boolean,
    inAppEnabled: boolean
  ): Promise<NotificationPreference> {
    return await userPreferencesRepository.updateNotificationPreference(
      userId,
      category,
      emailEnabled,
      inAppEnabled
    );
  }

  async notifySupportReply(
    userId: string,
    ticketNumber: string,
    isStaffReply: boolean
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'support_reply',
      priority: 'normal',
      title: isStaffReply 
        ? 'Support ticket updated' 
        : 'New reply on your support ticket',
      message: `Your support ticket ${ticketNumber} has a new ${isStaffReply ? 'staff' : ''} reply.`,
      actionUrl: `/support/tickets/${ticketNumber}`,
      actionText: 'View Ticket',
      metadata: { ticketNumber },
    });
  }

  async notifySupportResolved(
    userId: string,
    ticketNumber: string
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'support_resolved',
      priority: 'normal',
      title: 'Support ticket resolved',
      message: `Your support ticket ${ticketNumber} has been marked as resolved.`,
      actionUrl: `/support/tickets/${ticketNumber}`,
      actionText: 'View Ticket',
      metadata: { ticketNumber },
    });
  }

  async notifyPasswordChanged(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'security_password_changed',
      priority: 'high',
      title: 'Password changed',
      message: 'Your account password was successfully changed.',
      actionUrl: '/settings/security',
      actionText: 'Security Settings',
    });
  }

  async notifyEmailChanged(userId: string, newEmail: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'security_email_changed',
      priority: 'high',
      title: 'Email address changed',
      message: `Your email address was changed to ${newEmail}.`,
      actionUrl: '/settings/profile',
      actionText: 'Profile Settings',
    });
  }

  async notifyMFAEnabled(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'security_mfa_enabled',
      priority: 'high',
      title: 'Two-factor authentication enabled',
      message: 'Two-factor authentication has been enabled on your account.',
      actionUrl: '/settings/security',
      actionText: 'Security Settings',
    });
  }

  async notifyMFADisabled(userId: string): Promise<void> {
    await this.createNotification({
      userId,
      type: 'security_mfa_disabled',
      priority: 'high',
      title: 'Two-factor authentication disabled',
      message: 'Two-factor authentication has been disabled on your account.',
      actionUrl: '/settings/security',
      actionText: 'Security Settings',
    });
  }

  async notifyCreditLow(userId: string, balance: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'billing_credit_low',
      priority: 'high',
      title: 'Credit balance low',
      message: `Your credit balance is low (${balance} credits remaining).`,
      actionUrl: '/billing',
      actionText: 'Add Credits',
      metadata: { balance },
    });
  }

  async notifyPaymentSuccess(
    userId: string,
    amount: number,
    credits: number
  ): Promise<void> {
    await this.createNotification({
      userId,
      type: 'billing_payment_success',
      priority: 'normal',
      title: 'Payment successful',
      message: `Your payment of $${amount.toFixed(2)} was successful. ${credits} credits added.`,
      actionUrl: '/billing',
      actionText: 'View Billing',
      metadata: { amount, credits },
    });
  }

  async notifyPaymentFailed(userId: string, amount: number): Promise<void> {
    await this.createNotification({
      userId,
      type: 'billing_payment_failed',
      priority: 'urgent',
      title: 'Payment failed',
      message: `Your payment of $${amount.toFixed(2)} failed. Please update your payment method.`,
      actionUrl: '/billing/payment-methods',
      actionText: 'Update Payment',
      metadata: { amount },
    });
  }

  private getCategoryFromType(type: NotificationType): string {
    if (type.startsWith('support_')) return 'support';
    if (type.startsWith('billing_')) return 'billing';
    if (type.startsWith('security_')) return 'security';
    if (type.startsWith('system_')) return 'system';
    return 'system';
  }
}

export const notificationService = new NotificationService();
