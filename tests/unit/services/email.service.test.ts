/**
 * Unit tests for EmailService
 *
 * Tests all email sending methods, nodemailer integration, template generation,
 * and error handling.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Use vi.hoisted so refs are available inside the hoisted vi.mock factory
const mockSendMail = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ messageId: 'test-message-id' })
);

vi.mock('nodemailer', () => ({
  default: {
    createTransport: vi.fn().mockReturnValue({
      sendMail: mockSendMail,
    }),
  },
}));

import { EmailService } from '../../../src/services/email.service.js';

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    vi.clearAllMocks();
    mockSendMail.mockResolvedValue({ messageId: 'test-message-id' });
    // Set env defaults so URL-building works consistently
    process.env.APP_URL = 'https://app.scrapifie.com';
    process.env.FROM_EMAIL = 'noreply@scrapifie.com';
    process.env.FROM_NAME = 'Scrapifie';
    emailService = new EmailService();
  });

  // ─── sendEmailVerification ────────────────────────────────────────────────
  describe('sendEmailVerification', () => {
    it('sends to the correct recipient with the correct subject', async () => {
      await emailService.sendEmailVerification('user@example.com', 'tok123');

      expect(mockSendMail).toHaveBeenCalledOnce();
      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Verify your email address');
    });

    it('includes the verification URL built from APP_URL and token', async () => {
      await emailService.sendEmailVerification('user@example.com', 'my-verify-token');

      const opts = mockSendMail.mock.calls[0][0];
      const expectedUrl =
        'https://app.scrapifie.com/auth/verify-email?token=my-verify-token';
      expect(opts.html).toContain(expectedUrl);
      expect(opts.text).toContain(expectedUrl);
    });

    it('includes plain-text fallback', async () => {
      await emailService.sendEmailVerification('user@example.com', 'tok');

      const opts = mockSendMail.mock.calls[0][0];
      expect(typeof opts.text).toBe('string');
      expect(opts.text!.length).toBeGreaterThan(0);
    });

    it('uses FROM_NAME and FROM_EMAIL in the from field', async () => {
      await emailService.sendEmailVerification('u@e.com', 't');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.from).toContain('noreply@scrapifie.com');
      expect(opts.from).toContain('Scrapifie');
    });

    it('propagates sendMail errors to the caller', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP connection refused'));

      await expect(
        emailService.sendEmailVerification('user@example.com', 'tok')
      ).rejects.toThrow('SMTP connection refused');
    });
  });

  // ─── sendEmailChangeVerification ─────────────────────────────────────────
  describe('sendEmailChangeVerification', () => {
    it('sends to the new email address', async () => {
      await emailService.sendEmailChangeVerification(
        'new@example.com',
        'old@example.com',
        'change-token'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('new@example.com');
      expect(opts.subject).toBe('Verify your new email address');
    });

    it('includes the old email in the HTML body', async () => {
      await emailService.sendEmailChangeVerification(
        'new@example.com',
        'old@example.com',
        'change-token'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('old@example.com');
    });

    it('includes the change verification URL', async () => {
      await emailService.sendEmailChangeVerification(
        'new@example.com',
        'old@example.com',
        'chg-tok-xyz'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain(
        'https://app.scrapifie.com/settings/verify-email-change?token=chg-tok-xyz'
      );
    });
  });

  // ─── sendEmailChangeNotification ─────────────────────────────────────────
  describe('sendEmailChangeNotification', () => {
    it('sends to the old email address', async () => {
      await emailService.sendEmailChangeNotification(
        'old@example.com',
        'new@example.com'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('old@example.com');
      expect(opts.subject).toBe('Your email address was changed');
    });

    it('mentions the new email in the HTML body', async () => {
      await emailService.sendEmailChangeNotification(
        'old@example.com',
        'new@example.com'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('new@example.com');
    });

    it('includes security-notice language', async () => {
      await emailService.sendEmailChangeNotification(
        'old@example.com',
        'new@example.com'
      );

      const opts = mockSendMail.mock.calls[0][0];
      // The template contains a "Security Notice" alert section
      expect(opts.html).toContain('Security Notice');
    });
  });

  // ─── sendPasswordResetEmail ───────────────────────────────────────────────
  describe('sendPasswordResetEmail', () => {
    it('sends password reset email to correct address', async () => {
      await emailService.sendPasswordResetEmail('user@example.com', 'reset-tok');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Reset your password');
    });

    it('includes reset URL in both html and text', async () => {
      await emailService.sendPasswordResetEmail('user@example.com', 'reset-tok-abc');

      const opts = mockSendMail.mock.calls[0][0];
      const expectedUrl =
        'https://app.scrapifie.com/auth/reset-password?token=reset-tok-abc';
      expect(opts.html).toContain(expectedUrl);
      expect(opts.text).toContain(expectedUrl);
    });

    it('propagates SMTP errors', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('SMTP timeout'));

      await expect(
        emailService.sendPasswordResetEmail('u@e.com', 't')
      ).rejects.toThrow('SMTP timeout');
    });
  });

  // ─── sendPasswordChangedEmail ─────────────────────────────────────────────
  describe('sendPasswordChangedEmail', () => {
    it('sends password-changed notification to the given address', async () => {
      await emailService.sendPasswordChangedEmail('user@example.com');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Your password was changed');
    });

    it('includes success-confirmation language in the body', async () => {
      await emailService.sendPasswordChangedEmail('user@example.com');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('successfully changed');
    });

    it('no token or URL is required – text fallback is present', async () => {
      await emailService.sendPasswordChangedEmail('user@example.com');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.text).toContain('successfully changed');
    });
  });

  // ─── sendSupportTicketCreated ─────────────────────────────────────────────
  describe('sendSupportTicketCreated', () => {
    it('sends to correct address with ticket-number in subject', async () => {
      await emailService.sendSupportTicketCreated(
        'user@example.com',
        'TICK-001',
        'My billing question'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toContain('TICK-001');
    });

    it('includes ticket number and subject in HTML body', async () => {
      await emailService.sendSupportTicketCreated(
        'user@example.com',
        'TICK-001',
        'My billing question'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('TICK-001');
      expect(opts.html).toContain('My billing question');
    });

    it('includes a link to view the ticket', async () => {
      await emailService.sendSupportTicketCreated(
        'user@example.com',
        'TICK-001',
        'Some subject'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain(
        'https://app.scrapifie.com/support/tickets/TICK-001'
      );
    });
  });

  // ─── sendSupportTicketReply ───────────────────────────────────────────────
  describe('sendSupportTicketReply', () => {
    it('sends staff-reply notification to the given address', async () => {
      await emailService.sendSupportTicketReply(
        'user@example.com',
        'TICK-002',
        true
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toContain('TICK-002');
    });

    it('mentions staff in HTML body when isStaffReply is true', async () => {
      await emailService.sendSupportTicketReply(
        'user@example.com',
        'TICK-002',
        true
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('support team');
    });

    it('uses plain language when isStaffReply is false', async () => {
      await emailService.sendSupportTicketReply(
        'user@example.com',
        'TICK-002',
        false
      );

      const opts = mockSendMail.mock.calls[0][0];
      // When not staff, it says "You added a new reply"
      expect(opts.html).toContain('You');
    });

    it('includes the ticket URL', async () => {
      await emailService.sendSupportTicketReply(
        'user@example.com',
        'TICK-003',
        false
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain(
        'https://app.scrapifie.com/support/tickets/TICK-003'
      );
    });
  });

  // ─── sendPaymentSuccessEmail ──────────────────────────────────────────────
  describe('sendPaymentSuccessEmail', () => {
    it('sends payment-received email with invoice number in subject', async () => {
      await emailService.sendPaymentSuccessEmail('user@example.com', 2999, 'INV-2024-001');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toContain('INV-2024-001');
    });

    it('includes dollar amount formatted from cents', async () => {
      await emailService.sendPaymentSuccessEmail('user@example.com', 4900, 'INV-001');

      const opts = mockSendMail.mock.calls[0][0];
      // 4900 cents = $49.00
      expect(opts.text).toContain('49.00');
    });

    it('includes invoice number in the text fallback', async () => {
      await emailService.sendPaymentSuccessEmail('user@example.com', 1000, 'INV-TEST');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.text).toContain('INV-TEST');
    });
  });

  // ─── sendPaymentFailedEmail ───────────────────────────────────────────────
  describe('sendPaymentFailedEmail', () => {
    it('sends payment-failed email', async () => {
      await emailService.sendPaymentFailedEmail(
        'user@example.com',
        2999,
        'Insufficient funds'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Payment Failed');
    });

    it('includes failure reason in text fallback', async () => {
      await emailService.sendPaymentFailedEmail(
        'user@example.com',
        500,
        'Card declined'
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.text).toContain('Card declined');
    });

    it('formats amount from cents correctly', async () => {
      await emailService.sendPaymentFailedEmail('user@example.com', 10000, 'reason');

      const opts = mockSendMail.mock.calls[0][0];
      // 10000 cents = $100.00
      expect(opts.text).toContain('100.00');
    });
  });

  // ─── sendSubscriptionUpgradedEmail ───────────────────────────────────────
  describe('sendSubscriptionUpgradedEmail', () => {
    it('sends subscription-upgraded email mentioning the new plan', async () => {
      await emailService.sendSubscriptionUpgradedEmail('user@example.com', 'Pro');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toContain('Pro');
      expect(opts.text).toContain('Pro');
    });
  });

  // ─── sendSubscriptionCanceledEmail ───────────────────────────────────────
  describe('sendSubscriptionCanceledEmail', () => {
    it('sends subscription-canceled email with end date', async () => {
      const endDate = new Date('2025-12-31');
      await emailService.sendSubscriptionCanceledEmail('user@example.com', endDate);

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Subscription Canceled');
      // The text fallback uses toLocaleDateString which differs by locale,
      // so just verify the overall shape
      expect(opts.text).toContain('canceled');
    });

    it('includes end date in HTML body', async () => {
      const endDate = new Date('2025-06-30');
      await emailService.sendSubscriptionCanceledEmail('user@example.com', endDate);

      const opts = mockSendMail.mock.calls[0][0];
      // HTML uses toLocaleDateString
      expect(opts.html).toContain('2025');
    });
  });

  // ─── sendCreditPackPurchasedEmail ─────────────────────────────────────────
  describe('sendCreditPackPurchasedEmail', () => {
    it('sends credit-pack-purchased email with credits and amount', async () => {
      await emailService.sendCreditPackPurchasedEmail(
        'user@example.com',
        100000,
        4900
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toBe('Credit Pack Purchased');
    });

    it('formats credits with locale separator in text', async () => {
      await emailService.sendCreditPackPurchasedEmail(
        'user@example.com',
        50000,
        2500
      );

      const opts = mockSendMail.mock.calls[0][0];
      // 50000.toLocaleString() → '50,000' in en-US
      expect(opts.text).toMatch(/50[,.]?000/);
    });

    it('formats amount from cents', async () => {
      await emailService.sendCreditPackPurchasedEmail(
        'user@example.com',
        10000,
        4999
      );

      const opts = mockSendMail.mock.calls[0][0];
      // 4999 cents = $49.99
      expect(opts.text).toContain('49.99');
    });
  });

  // ─── sendInvoiceEmail ────────────────────────────────────────────────────
  describe('sendInvoiceEmail', () => {
    it('sends invoice email with correct subject', async () => {
      const dueDate = new Date('2025-01-31');
      await emailService.sendInvoiceEmail(
        'user@example.com',
        'INV-2025-001',
        9900,
        dueDate
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.to).toBe('user@example.com');
      expect(opts.subject).toContain('INV-2025-001');
    });

    it('includes invoice number in the HTML body', async () => {
      const dueDate = new Date('2025-03-15');
      await emailService.sendInvoiceEmail(
        'user@example.com',
        'INV-XYZ',
        1000,
        dueDate
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain('INV-XYZ');
    });

    it('includes a link to view the invoice', async () => {
      const dueDate = new Date('2025-04-01');
      await emailService.sendInvoiceEmail(
        'user@example.com',
        'INV-LINK-TEST',
        500,
        dueDate
      );

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.html).toContain(
        'https://app.scrapifie.com/billing/invoices/INV-LINK-TEST'
      );
    });

    it('formats amount from cents in text', async () => {
      const dueDate = new Date('2025-06-01');
      await emailService.sendInvoiceEmail('user@example.com', 'INV-1', 29900, dueDate);

      const opts = mockSendMail.mock.calls[0][0];
      // 29900 cents = $299.00
      expect(opts.text).toContain('299.00');
    });
  });

  // ─── Shared behaviour ────────────────────────────────────────────────────
  describe('sendEmail (shared behaviour)', () => {
    it('always sets the from field from env variables', async () => {
      process.env.FROM_NAME = 'MyService';
      process.env.FROM_EMAIL = 'hello@myservice.io';
      const svc = new EmailService();

      await svc.sendEmailVerification('u@e.com', 't');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.from).toBe('MyService <hello@myservice.io>');
    });

    it('falls back to default from values when env vars are missing', async () => {
      delete process.env.FROM_NAME;
      delete process.env.FROM_EMAIL;
      const svc = new EmailService();

      await svc.sendEmailVerification('u@e.com', 't');

      const opts = mockSendMail.mock.calls[0][0];
      expect(opts.from).toContain('noreply@scrapifie.com');
    });

    it('re-throws sendMail errors after logging', async () => {
      mockSendMail.mockRejectedValueOnce(new Error('Connection lost'));
      await expect(
        emailService.sendPasswordChangedEmail('u@e.com')
      ).rejects.toThrow('Connection lost');
    });
  });
});
