import schedule from 'node-schedule';
import { userPreferencesRepository } from '../../db/repositories/userPreferences.repository.js';
import { logger } from '../../utils/logger.js';

export function initializeTokenCleanupTask() {
  schedule.scheduleJob('0 */6 * * *', async () => {
    try {
      await userPreferencesRepository.cleanupExpiredTokens();
      logger.info('Expired tokens cleaned up');
    } catch (error) {
      logger.error('Failed to cleanup expired tokens:', error);
    }
  });

  logger.info('Token cleanup task initialized (runs every 6 hours)');
}
