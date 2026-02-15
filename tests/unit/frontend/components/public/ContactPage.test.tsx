/**
 * Unit tests for ContactPage Component
 *
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 8: Contact Page - Form validation, submission handling, success/error states
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { ContactPage } from '../../../src/frontend/pages/public/ContactPage';

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('ContactPage', () => {
  let fetchMock: any;

  beforeEach(() => {
    vi.clearAllMocks();
    fetchMock = vi.fn();
    global.fetch = fetchMock;
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Page Structure', () => {
    it('should render page heading', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('Get in Touch')).toBeInTheDocument();
    });

    it('should render page subtitle', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('Have questions? We would love to hear from you.')).toBeInTheDocument();
    });

    it('should render contact form', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByRole('form')).toBeInTheDocument();
    });

    it('should render contact info panel', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('Email')).toBeInTheDocument();
      expect(screen.getByText('Support Hours')).toBeInTheDocument();
      expect(screen.getByText('Response Time')).toBeInTheDocument();
    });
  });

  describe('Form Fields', () => {
    it('should render all required form fields', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByLabelText('Name')).toBeInTheDocument();
      expect(screen.getByLabelText('Email')).toBeInTheDocument();
      expect(screen.getByLabelText('Subject')).toBeInTheDocument();
      expect(screen.getByLabelText('Message')).toBeInTheDocument();
    });

    it('should have honeypot field hidden', () => {
      renderWithRouter(<ContactPage />);

      const honeypot = document.querySelector('input[style*="display: none"]');
      expect(honeypot).toBeInTheDocument();
      expect(honeypot).toHaveAttribute('tabIndex', '-1');
    });

    it('should have correct input types', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByLabelText('Name')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Email')).toHaveAttribute('type', 'email');
      expect(screen.getByLabelText('Subject')).toHaveAttribute('type', 'text');
      expect(screen.getByLabelText('Message')).toHaveAttribute('tagName', 'TEXTAREA');
    });
  });

  describe('Form Validation', () => {
    it('should show validation error for empty name on blur', async () => {
      renderWithRouter(<ContactPage />);

      const nameInput = screen.getByLabelText('Name');
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('should show validation error for short name', async () => {
      renderWithRouter(<ContactPage />);

      const nameInput = screen.getByLabelText('Name');
      fireEvent.change(nameInput, { target: { value: 'A' } });
      fireEvent.blur(nameInput);

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
      });
    });

    it('should show validation error for invalid email', async () => {
      renderWithRouter(<ContactPage />);

      const emailInput = screen.getByLabelText('Email');
      fireEvent.change(emailInput, { target: { value: 'invalid-email' } });
      fireEvent.blur(emailInput);

      await waitFor(() => {
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
      });
    });

    it('should show validation error for short subject', async () => {
      renderWithRouter(<ContactPage />);

      const subjectInput = screen.getByLabelText('Subject');
      fireEvent.change(subjectInput, { target: { value: 'Hi' } });
      fireEvent.blur(subjectInput);

      await waitFor(() => {
        expect(screen.getByText('Subject must be at least 5 characters')).toBeInTheDocument();
      });
    });

    it('should show validation error for short message', async () => {
      renderWithRouter(<ContactPage />);

      const messageInput = screen.getByLabelText('Message');
      fireEvent.change(messageInput, { target: { value: 'Short message' } });
      fireEvent.blur(messageInput);

      await waitFor(() => {
        expect(screen.getByText('Message must be at least 20 characters')).toBeInTheDocument();
      });
    });

    it('should detect honeypot field filled by bot', async () => {
      renderWithRouter(<ContactPage />);

      const honeypotInput = document.querySelector('input[style*="display: none"]');
      fireEvent.change(honeypotInput!, { target: { value: 'bot input' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Bot detected')).toBeInTheDocument();
      });
    });

    it('should validate all fields before submission', async () => {
      renderWithRouter(<ContactPage />);

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Name must be at least 2 characters')).toBeInTheDocument();
        expect(screen.getByText('Invalid email address')).toBeInTheDocument();
        expect(screen.getByText('Subject must be at least 5 characters')).toBeInTheDocument();
        expect(screen.getByText('Message must be at least 20 characters')).toBeInTheDocument();
      });
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithRouter(<ContactPage />);

      // Fill form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Test inquiry' } });
      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(fetchMock).toHaveBeenCalledWith('/api/public/contact', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            name: 'John Doe',
            email: 'john@example.com',
            subject: 'Test inquiry',
            message: 'This is a test message with enough characters to pass validation.',
            honeypot: '',
          }),
        });
      });
    });

    it('should show success message on successful submission', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithRouter(<ContactPage />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Test inquiry' } });
      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Thank you for your message. We will get back to you within 24 hours.')).toBeInTheDocument();
      });
    });

    it('should reset form after successful submission', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      renderWithRouter(<ContactPage />);

      // Fill form
      const nameInput = screen.getByLabelText('Name');
      const emailInput = screen.getByLabelText('Email');
      const subjectInput = screen.getByLabelText('Subject');
      const messageInput = screen.getByLabelText('Message');

      fireEvent.change(nameInput, { target: { value: 'John Doe' } });
      fireEvent.change(emailInput, { target: { value: 'john@example.com' } });
      fireEvent.change(subjectInput, { target: { value: 'Test inquiry' } });
      fireEvent.change(messageInput, { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(nameInput).toHaveValue('');
        expect(emailInput).toHaveValue('');
        expect(subjectInput).toHaveValue('');
        expect(messageInput).toHaveValue('');
      });
    });

    it('should show error message on failed submission', async () => {
      fetchMock.mockResolvedValueOnce({
        ok: false,
        json: async () => ({ message: 'Rate limit exceeded' }),
      });

      renderWithRouter(<ContactPage />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Test inquiry' } });
      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Rate limit exceeded')).toBeInTheDocument();
      });
    });

    it('should show generic error message on network failure', async () => {
      fetchMock.mockRejectedValueOnce(new Error('Network error'));

      renderWithRouter(<ContactPage />);

      // Fill and submit form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Test inquiry' } });
      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('An error occurred')).toBeInTheDocument();
      });
    });

    it('should disable submit button during submission', async () => {
      fetchMock.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      renderWithRouter(<ContactPage />);

      // Fill form
      fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'John Doe' } });
      fireEvent.change(screen.getByLabelText('Email'), { target: { value: 'john@example.com' } });
      fireEvent.change(screen.getByLabelText('Subject'), { target: { value: 'Test inquiry' } });
      fireEvent.change(screen.getByLabelText('Message'), { target: { value: 'This is a test message with enough characters to pass validation.' } });

      const submitButton = screen.getByText('Send Message');
      fireEvent.click(submitButton);

      expect(submitButton).toBeDisabled();
      expect(screen.getByText('Sending...')).toBeInTheDocument();
    });
  });

  describe('Contact Information', () => {
    it('should display email contact info', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('support@scrapifie.com')).toBeInTheDocument();
    });

    it('should display support hours', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('Monday - Friday: 9:00 AM - 6:00 PM UTC')).toBeInTheDocument();
      expect(screen.getByText('Enterprise: 24/7 support available')).toBeInTheDocument();
    });

    it('should display response time information', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByText('We typically respond within 24 hours during business days.')).toBeInTheDocument();
    });

    it('should have clickable email link', () => {
      renderWithRouter(<ContactPage />);

      const emailLink = screen.getByText('support@scrapifie.com');
      expect(emailLink).toHaveAttribute('href', 'mailto:support@scrapifie.com');
    });
  });

  describe('Accessibility', () => {
    it('should have proper form labels', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByLabelText('Name')).toHaveAttribute('id', 'name');
      expect(screen.getByLabelText('Email')).toHaveAttribute('id', 'email');
      expect(screen.getByLabelText('Subject')).toHaveAttribute('id', 'subject');
      expect(screen.getByLabelText('Message')).toHaveAttribute('id', 'message');
    });

    it('should have proper heading hierarchy', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Get in Touch');
      expect(screen.getAllByRole('heading', { level: 3 })).toHaveLength(3); // Email, Support Hours, Response Time
    });

    it('should have proper button text', () => {
      renderWithRouter(<ContactPage />);

      expect(screen.getByRole('button')).toHaveTextContent('Send Message');
    });
  });

  describe('Visual Elements', () => {
    it('should have gradient background', () => {
      renderWithRouter(<ContactPage />);

      const section = screen.getByText('Get in Touch').closest('section');
      expect(section).toHaveClass('bg-gradient-to-br');
    });

    it('should have responsive grid layout', () => {
      renderWithRouter(<ContactPage />);

      const container = screen.getByText('Get in Touch').closest('div')?.nextElementSibling;
      expect(container).toHaveClass('grid', 'grid-cols-1', 'lg:grid-cols-3');
    });

    it('should have form styling', () => {
      renderWithRouter(<ContactPage />);

      const form = screen.getByRole('form');
      expect(form).toHaveClass('space-y-6');
    });
  });
});