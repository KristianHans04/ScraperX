import schedule from 'node-schedule';
import { notificationService } from '../../services/notification.service.js';
import { logger } from '../../utils/logger.js';

export function initializeNotificationCleanupTask() {
  schedule.scheduleJob('0 3 * * 0', async () => {
    try {
      const deletedCount = await notificationService.cleanupOldNotifications(90);
      logger.info(`Deleted ${deletedCount} old notifications (>90 days)`);
    } catch (error) {
      logger.error('Failed to cleanup old notifications:', error);
    }
  });

  logger.info('Notification cleanup task initialized (runs weekly on Sunday at 3 AM)');
}
