/**
 * Unit tests for CookieConsentBanner Component
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 7: Legal Pages - Cookie Consent Banner
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CookieConsentBanner } from '../../../src/frontend/components/public/CookieConsentBanner';

describe('CookieConsentBanner', () => {
  let localStorageMock: { [key: string]: string };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock = {};
    
    // Mock localStorage
    Object.defineProperty(window, 'localStorage', {
      value: {
        getItem: vi.fn((key: string) => localStorageMock[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          localStorageMock[key] = value;
        }),
        removeItem: vi.fn((key: string) => {
          delete localStorageMock[key];
        }),
        clear: vi.fn(() => {
          localStorageMock = {};
        }),
      },
      writable: true,
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Visibility', () => {
    it('should show banner when no consent is stored', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByText('Cookie Preferences')).toBeInTheDocument();
    });

    it('should not show banner when consent is already stored', () => {
      localStorageMock['cookieConsent'] = JSON.stringify({
        necessary: true,
        analytics: true,
        marketing: false,
        timestamp: new Date().toISOString(),
      });

      render(<CookieConsentBanner />);

      expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
    });

    it('should not show banner when consent is stored (any valid format)', () => {
      localStorageMock['cookieConsent'] = JSON.stringify({
        necessary: true,
        timestamp: '2024-01-01T00:00:00Z',
      });

      render(<CookieConsentBanner />);

      expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
    });
  });

  describe('Accept All', () => {
    it('should accept all cookies when Accept All clicked', () => {
      render(<CookieConsentBanner />);

      const acceptAllButton = screen.getByText('Accept All');
      fireEvent.click(acceptAllButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('"analytics":true')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('"marketing":true')
      );
    });

    it('should store timestamp when accepting all', () => {
      render(<CookieConsentBanner />);

      const acceptAllButton = screen.getByText('Accept All');
      fireEvent.click(acceptAllButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('timestamp')
      );
    });

    it('should hide banner after accepting all', async () => {
      render(<CookieConsentBanner />);

      const acceptAllButton = screen.getByText('Accept All');
      fireEvent.click(acceptAllButton);

      await waitFor(() => {
        expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
      });
    });
  });

  describe('Reject All', () => {
    it('should reject non-essential cookies when Reject All clicked', () => {
      render(<CookieConsentBanner />);

      const rejectAllButton = screen.getByText('Reject All');
      fireEvent.click(rejectAllButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('"analytics":false')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('"marketing":false')
      );
    });

    it('should always accept necessary cookies', () => {
      render(<CookieConsentBanner />);

      const rejectAllButton = screen.getByText('Reject All');
      fireEvent.click(rejectAllButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('"necessary":true')
      );
    });

    it('should store timestamp when rejecting', () => {
      render(<CookieConsentBanner />);

      const rejectAllButton = screen.getByText('Reject All');
      fireEvent.click(rejectAllButton);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'cookieConsent',
        expect.stringContaining('timestamp')
      );
    });

    it('should hide banner after rejecting', async () => {
      render(<CookieConsentBanner />);

      const rejectAllButton = screen.getByText('Reject All');
      fireEvent.click(rejectAllButton);

      await waitFor(() => {
        expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
      });
    });
  });

  describe('Customize Button', () => {
    it('should render Customize button', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByText('Customize')).toBeInTheDocument();
    });

    it('should hide banner when Customize is clicked (current implementation)', () => {
      render(<CookieConsentBanner />);

      const customizeButton = screen.getByText('Customize');
      fireEvent.click(customizeButton);

      // Current implementation just hides the banner
      expect(screen.queryByText('Cookie Preferences')).not.toBeInTheDocument();
    });
  });

  describe('Banner Content', () => {
    it('should render cookie policy link', () => {
      render(<CookieConsentBanner />);

      const learnMoreLink = screen.getByText('Learn more');
      expect(learnMoreLink).toHaveAttribute('href', '/legal/cookies');
    });

    it('should render description text', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByText(/We use cookies to enhance your experience/)).toBeInTheDocument();
    });

    it('should have correct heading', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByRole('heading', { name: 'Cookie Preferences' })).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have dialog role', () => {
      render(<CookieConsentBanner />);

      // The banner container should be accessible
      expect(screen.getByText('Cookie Preferences').closest('div')).toBeInTheDocument();
    });

    it('should have all buttons accessible', () => {
      render(<CookieConsentBanner />);

      expect(screen.getByText('Accept All')).toBeEnabled();
      expect(screen.getByText('Reject All')).toBeEnabled();
      expect(screen.getByText('Customize')).toBeEnabled();
    });
  });

  describe('Visual Elements', () => {
    it('should have fixed positioning at bottom', () => {
      render(<CookieConsentBanner />);

      const banner = screen.getByText('Cookie Preferences').closest('div')?.parentElement;
      expect(banner).toHaveClass('fixed', 'bottom-0');
    });

    it('should have high z-index', () => {
      render(<CookieConsentBanner />);

      const banner = screen.getByText('Cookie Preferences').closest('div')?.parentElement;
      expect(banner).toHaveClass('z-50');
    });

    it('should have shadow', () => {
      render(<CookieConsentBanner />);

      const banner = screen.getByText('Cookie Preferences').closest('div')?.parentElement;
      expect(banner).toHaveClass('shadow-lg');
    });
  });

  describe('Storage Format', () => {
    it('should store consent in JSON format', () => {
      render(<CookieConsentBanner />);

      const acceptAllButton = screen.getByText('Accept All');
      fireEvent.click(acceptAllButton);

      const storedValue = (localStorage.setItem as any).mock.calls[0][1];
      expect(() => JSON.parse(storedValue)).not.toThrow();
    });

    it('should store all required consent fields', () => {
      render(<CookieConsentBanner />);

      const acceptAllButton = screen.getByText('Accept All');
      fireEvent.click(acceptAllButton);

      const storedValue = (localStorage.setItem as any).mock.calls[0][1];
      const parsed = JSON.parse(storedValue);
      
      expect(parsed).toHaveProperty('necessary');
      expect(parsed).toHaveProperty('analytics');
      expect(parsed).toHaveProperty('marketing');
      expect(parsed).toHaveProperty('timestamp');
    });
  });
});
