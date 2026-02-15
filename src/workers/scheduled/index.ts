import { initializeTicketAutoCloseTask } from './ticketAutoClose.task.js';
import { initializeTokenCleanupTask } from './tokenCleanup.task.js';
import { initializeNotificationCleanupTask } from './notificationCleanup.task.js';

export function initializeScheduledTasks() {
  initializeTicketAutoCloseTask();
  initializeTokenCleanupTask();
  initializeNotificationCleanupTask();
}
