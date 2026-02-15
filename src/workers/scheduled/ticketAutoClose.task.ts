import schedule from 'node-schedule';
import { supportService } from '../../services/support.service.js';
import { logger } from '../../utils/logger.js';

export function initializeTicketAutoCloseTask() {
  schedule.scheduleJob('0 2 * * *', async () => {
    try {
      const closedCount = await supportService.autoCloseTickets();
      logger.info(`Auto-closed ${closedCount} tickets`);
    } catch (error) {
      logger.error('Failed to auto-close tickets:', error);
    }
  });

  logger.info('Ticket auto-close task initialized (runs daily at 2 AM)');
}
