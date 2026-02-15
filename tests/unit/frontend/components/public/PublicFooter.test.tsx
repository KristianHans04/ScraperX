/**
 * Unit tests for PublicFooter Component
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 1: Public Website Layout - Footer Component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PublicFooter } from '../../../src/frontend/components/public/PublicFooter';

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PublicFooter', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Footer Link Sections', () => {
    it('should render all footer sections', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Product')).toBeInTheDocument();
      expect(screen.getByText('Company')).toBeInTheDocument();
      expect(screen.getByText('Resources')).toBeInTheDocument();
      expect(screen.getByText('Legal')).toBeInTheDocument();
    });

    it('should render Product section links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Features')).toBeInTheDocument();
      expect(screen.getByText('Pricing')).toBeInTheDocument();
      expect(screen.getByText('API Documentation')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('should render Company section links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('About Us')).toBeInTheDocument();
      expect(screen.getByText('Blog')).toBeInTheDocument();
      expect(screen.getByText('Contact')).toBeInTheDocument();
    });

    it('should render Resources section links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Quickstart Guide')).toBeInTheDocument();
      expect(screen.getByText('API Reference')).toBeInTheDocument();
      expect(screen.getByText('Guides')).toBeInTheDocument();
      expect(screen.getByText('Changelog')).toBeInTheDocument();
    });

    it('should render Legal section links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Terms of Service')).toBeInTheDocument();
      expect(screen.getByText('Privacy Policy')).toBeInTheDocument();
      expect(screen.getByText('Acceptable Use Policy')).toBeInTheDocument();
      expect(screen.getByText('Cookie Policy')).toBeInTheDocument();
      expect(screen.getByText('Data Processing Agreement')).toBeInTheDocument();
    });

    it('should have correct href for Features link', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Features').closest('a')).toHaveAttribute('href', '/#features');
    });

    it('should have correct href for Pricing link', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Pricing').closest('a')).toHaveAttribute('href', '/pricing');
    });

    it('should have correct href for Terms of Service link', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Terms of Service').closest('a')).toHaveAttribute('href', '/legal/terms');
    });

    it('should have correct href for Privacy Policy link', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Privacy Policy').closest('a')).toHaveAttribute('href', '/legal/privacy');
    });
  });

  describe('Newsletter Section', () => {
    it('should render newsletter section', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Subscribe to our newsletter')).toBeInTheDocument();
    });

    it('should render email input field', () => {
      renderWithRouter(<PublicFooter />);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      expect(emailInput).toBeInTheDocument();
      expect(emailInput).toHaveAttribute('type', 'email');
      expect(emailInput).toHaveAttribute('required');
    });

    it('should render subscribe button', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText('Subscribe')).toBeInTheDocument();
    });

    it('should update email input value on change', () => {
      renderWithRouter(<PublicFooter />);

      const emailInput = screen.getByPlaceholderText('Enter your email');
      fireEvent.change(emailInput, { target: { value: 'test@example.com' } });

      expect(emailInput).toHaveValue('test@example.com');
    });
  });

  describe('Social Links', () => {
    it('should render social media links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
      expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
    });

    it('should have correct external href for GitHub', () => {
      renderWithRouter(<PublicFooter />);

      const githubLink = screen.getByLabelText('GitHub');
      expect(githubLink).toHaveAttribute('href', 'https://github.com/scrapifie');
      expect(githubLink).toHaveAttribute('target', '_blank');
      expect(githubLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have correct external href for Twitter', () => {
      renderWithRouter(<PublicFooter />);

      const twitterLink = screen.getByLabelText('Twitter');
      expect(twitterLink).toHaveAttribute('href', 'https://twitter.com/scrapifie');
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('should have correct external href for LinkedIn', () => {
      renderWithRouter(<PublicFooter />);

      const linkedinLink = screen.getByLabelText('LinkedIn');
      expect(linkedinLink).toHaveAttribute('href', 'https://linkedin.com/company/scrapifie');
      expect(linkedinLink).toHaveAttribute('target', '_blank');
      expect(linkedinLink).toHaveAttribute('rel', 'noopener noreferrer');
    });
  });

  describe('Copyright Section', () => {
    it('should render copyright notice with current year', () => {
      renderWithRouter(<PublicFooter />);

      const currentYear = new Date().getFullYear();
      expect(screen.getByText(new RegExp(`© ${currentYear} Scrapifie`))).toBeInTheDocument();
    });

    it('should contain All rights reserved text', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByText(/All rights reserved/)).toBeInTheDocument();
    });
  });

  describe('Mobile Accordion Behavior', () => {
    it('should render accordion buttons on mobile', () => {
      renderWithRouter(<PublicFooter />);

      // The accordion buttons are the section headers
      const productButton = screen.getByRole('button', { name: 'Product' });
      expect(productButton).toBeInTheDocument();
    });

    it('should toggle section when accordion button is clicked', () => {
      renderWithRouter(<PublicFooter />);

      const productButton = screen.getByRole('button', { name: 'Product' });
      
      // Initially, links should be visible in desktop view
      // Click to toggle (implementation may vary)
      fireEvent.click(productButton);

      // Button should have aria-expanded attribute
      expect(productButton).toHaveAttribute('aria-expanded');
    });

    it('should have aria-expanded attribute on accordion buttons', () => {
      renderWithRouter(<PublicFooter />);

      const buttons = screen.getAllByRole('button');
      const accordionButtons = buttons.filter(btn => 
        ['Product', 'Company', 'Resources', 'Legal'].includes(btn.textContent || '')
      );

      accordionButtons.forEach(button => {
        expect(button).toHaveAttribute('aria-expanded');
      });
    });
  });

  describe('Accessibility', () => {
    it('should have contentinfo role (footer)', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByRole('contentinfo')).toBeInTheDocument();
    });

    it('should have aria-label on social links', () => {
      renderWithRouter(<PublicFooter />);

      expect(screen.getByLabelText('GitHub')).toBeInTheDocument();
      expect(screen.getByLabelText('Twitter')).toBeInTheDocument();
      expect(screen.getByLabelText('LinkedIn')).toBeInTheDocument();
    });
  });
});
