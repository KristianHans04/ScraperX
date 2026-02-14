import nodemailer from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private readonly FROM_EMAIL = process.env.FROM_EMAIL || 'noreply@scrapifie.com';
  private readonly FROM_NAME = process.env.FROM_NAME || 'Scrapifie';
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '1025', 10),
      secure: false,
      ignoreTLS: true,
    });
  }

  async sendEmailVerification(email: string, token: string): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/auth/verify-email?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Verify your email address',
      html: this.emailVerificationTemplate(verificationUrl),
      text: `Please verify your email address by visiting: ${verificationUrl}`,
    });
  }

  async sendEmailChangeVerification(
    newEmail: string,
    oldEmail: string,
    token: string
  ): Promise<void> {
    const verificationUrl = `${process.env.APP_URL}/settings/verify-email-change?token=${token}`;

    await this.sendEmail({
      to: newEmail,
      subject: 'Verify your new email address',
      html: this.emailChangeVerificationTemplate(verificationUrl, oldEmail),
      text: `Please verify your new email address by visiting: ${verificationUrl}`,
    });
  }

  async sendEmailChangeNotification(oldEmail: string, newEmail: string): Promise<void> {
    await this.sendEmail({
      to: oldEmail,
      subject: 'Your email address was changed',
      html: this.emailChangeNotificationTemplate(newEmail),
      text: `Your email address was changed to ${newEmail}. If you did not make this change, please contact support immediately.`,
    });
  }

  async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${process.env.APP_URL}/auth/reset-password?token=${token}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset your password',
      html: this.passwordResetTemplate(resetUrl),
      text: `Reset your password by visiting: ${resetUrl}`,
    });
  }

  async sendPasswordChangedEmail(email: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Your password was changed',
      html: this.passwordChangedTemplate(),
      text: 'Your password was successfully changed. If you did not make this change, please contact support immediately.',
    });
  }

  async sendSupportTicketCreated(
    email: string,
    ticketNumber: string,
    subject: string
  ): Promise<void> {
    const ticketUrl = `${process.env.APP_URL}/support/tickets/${ticketNumber}`;

    await this.sendEmail({
      to: email,
      subject: `Support ticket created: ${ticketNumber}`,
      html: this.supportTicketCreatedTemplate(ticketNumber, subject, ticketUrl),
      text: `Your support ticket ${ticketNumber} has been created. View it at: ${ticketUrl}`,
    });
  }

  async sendSupportTicketReply(
    email: string,
    ticketNumber: string,
    isStaffReply: boolean
  ): Promise<void> {
    const ticketUrl = `${process.env.APP_URL}/support/tickets/${ticketNumber}`;

    await this.sendEmail({
      to: email,
      subject: `New reply on ticket ${ticketNumber}`,
      html: this.supportTicketReplyTemplate(ticketNumber, isStaffReply, ticketUrl),
      text: `There is a new ${isStaffReply ? 'staff ' : ''}reply on ticket ${ticketNumber}. View it at: ${ticketUrl}`,
    });
  }

  private async sendEmail(options: EmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `${this.FROM_NAME} <${this.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
        html: options.html,
        text: options.text,
      });
      console.log('Email sent:', {
        from: `${this.FROM_NAME} <${this.FROM_EMAIL}>`,
        to: options.to,
        subject: options.subject,
      });
    } catch (error) {
      console.error('Failed to send email:', error);
      throw error;
    }
  }

  private emailHeader(): string {
    const logoUrl = `${process.env.APP_URL || 'https://scrapifie.com'}/Logo/Name-Light.svg`;
    return `
      <div style="text-align: center; padding: 24px 0 16px; border-bottom: 1px solid #e5e7eb; margin-bottom: 24px;">
        <a href="${process.env.APP_URL || 'https://scrapifie.com'}" style="text-decoration: none;">
          <img src="${logoUrl}" alt="Scrapifie" height="36" style="height: 36px; width: auto;" />
        </a>
      </div>
    `;
  }

  private emailVerificationTemplate(verificationUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Verify your email address</h1>
            <p>Thank you for signing up with Scrapifie. Please verify your email address by clicking the button below:</p>
            <p><a href="${verificationUrl}" class="button">Verify Email Address</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you did not create an account, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private emailChangeVerificationTemplate(verificationUrl: string, oldEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Verify your new email address</h1>
            <p>You requested to change your email address from <strong>${oldEmail}</strong> to this address.</p>
            <p>Please verify this new email address by clicking the button below:</p>
            <p><a href="${verificationUrl}" class="button">Verify New Email</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${verificationUrl}</p>
            <p>This link will expire in 24 hours.</p>
            <div class="footer">
              <p>If you did not request this change, please contact support immediately.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private emailChangeNotificationTemplate(newEmail: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { padding: 12px; background: #fef3c7; border-left: 4px solid #f59e0b; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Email address changed</h1>
            <div class="alert">
              <strong>Security Notice:</strong> Your account email address was changed.
            </div>
            <p>Your Scrapifie account email address was changed to: <strong>${newEmail}</strong></p>
            <p>If you made this change, no further action is required.</p>
            <p>If you did not authorize this change, please contact our support team immediately.</p>
            <div class="footer">
              <p>For security reasons, we sent this notification to your old email address.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private passwordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Reset your password</h1>
            <p>You requested to reset your password. Click the button below to create a new password:</p>
            <p><a href="${resetUrl}" class="button">Reset Password</a></p>
            <p>Or copy and paste this link into your browser:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <div class="footer">
              <p>If you did not request a password reset, you can safely ignore this email.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private passwordChangedTemplate(): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .alert { padding: 12px; background: #d1fae5; border-left: 4px solid #10b981; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Password changed successfully</h1>
            <div class="alert">
              Your password was successfully changed.
            </div>
            <p>If you made this change, no further action is required.</p>
            <p>If you did not authorize this change, please contact our support team immediately.</p>
            <div class="footer">
              <p>All other active sessions have been logged out for security.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private supportTicketCreatedTemplate(
    ticketNumber: string,
    subject: string,
    ticketUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; }
            .ticket-info { background: #f3f4f6; padding: 16px; border-radius: 6px; margin: 20px 0; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Support ticket created</h1>
            <p>Your support ticket has been created successfully.</p>
            <div class="ticket-info">
              <p><strong>Ticket Number:</strong> ${ticketNumber}</p>
              <p><strong>Subject:</strong> ${subject}</p>
            </div>
            <p>Our support team will review your request and respond as soon as possible.</p>
            <p><a href="${ticketUrl}" class="button">View Ticket</a></p>
            <div class="footer">
              <p>You can reply to your ticket at any time through your dashboard.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private supportTicketReplyTemplate(
    ticketNumber: string,
    isStaffReply: boolean,
    ticketUrl: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .button { display: inline-block; padding: 12px 24px; background: #2563eb; color: #fff; text-decoration: none; border-radius: 6px; }
            .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; }
          </style>
        </head>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>New reply on ticket ${ticketNumber}</h1>
            <p>${isStaffReply ? 'Our support team' : 'You'} added a new reply to ticket ${ticketNumber}.</p>
            <p><a href="${ticketUrl}" class="button">View Ticket</a></p>
            <div class="footer">
              <p>You will receive email notifications for all ticket updates.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  async sendPaymentSuccessEmail(email: string, amount: number, invoiceNumber: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Payment Received - Invoice ${invoiceNumber}`,
      html: this.paymentSuccessTemplate(amount, invoiceNumber),
      text: `Your payment of $${(amount / 100).toFixed(2)} has been received. Invoice: ${invoiceNumber}`,
    });
  }

  async sendPaymentFailedEmail(email: string, amount: number, reason: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Payment Failed',
      html: this.paymentFailedTemplate(amount, reason),
      text: `Your payment of $${(amount / 100).toFixed(2)} failed: ${reason}. Please update your payment method.`,
    });
  }

  async sendSubscriptionUpgradedEmail(email: string, newPlan: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Subscription Upgraded to ${newPlan}`,
      html: this.subscriptionUpgradedTemplate(newPlan),
      text: `Your subscription has been upgraded to the ${newPlan} plan.`,
    });
  }

  async sendSubscriptionCanceledEmail(email: string, endDate: Date): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Subscription Canceled',
      html: this.subscriptionCanceledTemplate(endDate),
      text: `Your subscription has been canceled and will end on ${endDate.toLocaleDateString()}.`,
    });
  }

  async sendCreditPackPurchasedEmail(email: string, credits: number, amount: number): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Credit Pack Purchased',
      html: this.creditPackPurchasedTemplate(credits, amount),
      text: `You purchased ${credits.toLocaleString()} credits for $${(amount / 100).toFixed(2)}.`,
    });
  }

  async sendInvoiceEmail(email: string, invoiceNumber: string, amount: number, dueDate: Date): Promise<void> {
    const invoiceUrl = `${process.env.APP_URL}/billing/invoices/${invoiceNumber}`;
    await this.sendEmail({
      to: email,
      subject: `Invoice ${invoiceNumber}`,
      html: this.invoiceTemplate(invoiceNumber, amount, dueDate, invoiceUrl),
      text: `Invoice ${invoiceNumber} for $${(amount / 100).toFixed(2)} is now available. Due: ${dueDate.toLocaleDateString()}`,
    });
  }

  private paymentSuccessTemplate(amount: number, invoiceNumber: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Payment Received</h1>
            <p>Thank you! Your payment of $${(amount / 100).toFixed(2)} has been successfully processed.</p>
            <p>Invoice Number: ${invoiceNumber}</p>
            <p><a href="${process.env.APP_URL}/billing/invoices" class="button">View Invoices</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private paymentFailedTemplate(amount: number, reason: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Payment Failed</h1>
            <p>We were unable to process your payment of $${(amount / 100).toFixed(2)}.</p>
            <p>Reason: ${reason}</p>
            <p>Please update your payment method to avoid service interruption.</p>
            <p><a href="${process.env.APP_URL}/billing" class="button">Update Payment Method</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private subscriptionUpgradedTemplate(newPlan: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Subscription Upgraded</h1>
            <p>Your subscription has been successfully upgraded to the ${newPlan} plan.</p>
            <p><a href="${process.env.APP_URL}/billing" class="button">View Billing</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private subscriptionCanceledTemplate(endDate: Date): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Subscription Canceled</h1>
            <p>Your subscription has been canceled and will remain active until ${endDate.toLocaleDateString()}.</p>
            <p>You can reactivate your subscription at any time before this date.</p>
            <p><a href="${process.env.APP_URL}/billing" class="button">Manage Subscription</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private creditPackPurchasedTemplate(credits: number, amount: number): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>Credit Pack Purchased</h1>
            <p>You have successfully purchased ${credits.toLocaleString()} credits for $${(amount / 100).toFixed(2)}.</p>
            <p><a href="${process.env.APP_URL}/billing/credit-history" class="button">View Credit History</a></p>
          </div>
        </body>
      </html>
    `;
  }

  private invoiceTemplate(invoiceNumber: string, amount: number, dueDate: Date, invoiceUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body>
          <div class="container">
            ${this.emailHeader()}
            <h1>New Invoice Available</h1>
            <p>Invoice ${invoiceNumber} is now available.</p>
            <p>Amount Due: $${(amount / 100).toFixed(2)}</p>
            <p>Due Date: ${dueDate.toLocaleDateString()}</p>
            <p><a href="${invoiceUrl}" class="button">View Invoice</a></p>
          </div>
        </body>
      </html>
    `;
  }
}

export const emailService = new EmailService();
