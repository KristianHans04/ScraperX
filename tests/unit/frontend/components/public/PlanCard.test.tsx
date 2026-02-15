/**
 * Unit tests for PlanCard Component
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 3: Pricing Page - Plan Cards
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PlanCard } from '../../../src/frontend/components/public/PlanCard';

const renderWithRouter = (component: React.ReactNode) => {
  return render(
    <BrowserRouter>
      {component}
    </BrowserRouter>
  );
};

describe('PlanCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const defaultProps = {
    name: 'Pro',
    price: '$49',
    priceAnnual: '$39',
    period: '/mo',
    description: 'For growing businesses',
    features: [
      '10,000 credits per month',
      '100 requests per minute',
      '20 concurrent requests',
      '90-day data retention',
      'Email support',
    ],
    cta: 'Get Started',
    ctaLink: '/register',
    billing: 'monthly' as const,
  };

  describe('Basic Rendering', () => {
    it('should render plan name', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('Pro')).toBeInTheDocument();
    });

    it('should render price', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('$49')).toBeInTheDocument();
    });

    it('should render period', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('/mo')).toBeInTheDocument();
    });

    it('should render description', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('For growing businesses')).toBeInTheDocument();
    });

    it('should render CTA button', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('Get Started')).toBeInTheDocument();
    });

    it('should have correct CTA link', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      expect(screen.getByText('Get Started').closest('a')).toHaveAttribute('href', '/register');
    });
  });

  describe('Features List', () => {
    it('should render all features', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      defaultProps.features.forEach(feature => {
        expect(screen.getByText(feature)).toBeInTheDocument();
      });
    });

    it('should render checkmark icons for features', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      const checkIcons = document.querySelectorAll('svg');
      expect(checkIcons.length).toBeGreaterThanOrEqual(defaultProps.features.length);
    });
  });

  describe('Billing Toggle', () => {
    it('should display monthly price when billing is monthly', () => {
      renderWithRouter(<PlanCard {...defaultProps} billing="monthly" />);

      expect(screen.getByText('$49')).toBeInTheDocument();
    });

    it('should display annual price when billing is annual', () => {
      renderWithRouter(<PlanCard {...defaultProps} billing="annual" />);

      expect(screen.getByText('$39')).toBeInTheDocument();
    });

    it('should show strikethrough price for annual billing on paid plans', () => {
      renderWithRouter(<PlanCard {...defaultProps} billing="annual" />);

      const originalPrice = screen.getByText('$49');
      expect(originalPrice).toHaveClass('line-through');
    });

    it('should not show strikethrough for free plans', () => {
      const freePlanProps = {
        ...defaultProps,
        name: 'Free',
        price: '$0',
        priceAnnual: undefined,
        billing: 'annual' as const,
      };

      renderWithRouter(<PlanCard {...freePlanProps} />);

      const price = screen.getByText('$0');
      expect(price).not.toHaveClass('line-through');
    });

    it('should show savings message for annual billing', () => {
      renderWithRouter(<PlanCard {...defaultProps} billing="annual" />);

      expect(screen.getByText(/Save 20% with annual billing/)).toBeInTheDocument();
    });

    it('should not show savings message for free plans', () => {
      const freePlanProps = {
        ...defaultProps,
        name: 'Free',
        price: '$0',
        billing: 'annual' as const,
      };

      renderWithRouter(<PlanCard {...freePlanProps} />);

      expect(screen.queryByText(/Save/)).not.toBeInTheDocument();
    });
  });

  describe('Featured State', () => {
    it('should not have featured styling by default', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).not.toHaveClass('scale-105');
    });

    it('should have featured styling when featured prop is true', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={true} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('scale-105');
    });

    it('should show "MOST POPULAR" badge when featured', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={true} />);

      expect(screen.getByText('MOST POPULAR')).toBeInTheDocument();
    });

    it('should not show badge when not featured', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={false} />);

      expect(screen.queryByText('MOST POPULAR')).not.toBeInTheDocument();
    });

    it('should have different background color when featured', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={true} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('bg-blue-600');
    });

    it('should have white text for featured card', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={true} />);

      const title = screen.getByText('Pro');
      expect(title).toHaveClass('text-white');
    });
  });

  describe('Plan Types', () => {
    it('should render Free plan correctly', () => {
      const freePlan = {
        name: 'Free',
        price: '$0',
        period: '/mo',
        description: 'For personal projects',
        features: ['1,000 credits per month', '10 requests per minute'],
        cta: 'Start Free',
        ctaLink: '/register',
        billing: 'monthly' as const,
      };

      renderWithRouter(<PlanCard {...freePlan} />);

      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('$0')).toBeInTheDocument();
      expect(screen.getByText('Start Free')).toBeInTheDocument();
    });

    it('should render Enterprise plan correctly', () => {
      const enterprisePlan = {
        name: 'Enterprise',
        price: 'Custom',
        period: '',
        description: 'For large organizations',
        features: ['Custom credits', 'Custom rate limits', 'Dedicated support'],
        cta: 'Contact Sales',
        ctaLink: '/contact',
        billing: 'monthly' as const,
      };

      renderWithRouter(<PlanCard {...enterprisePlan} />);

      expect(screen.getByText('Enterprise')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
      expect(screen.getByText('Contact Sales')).toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('should have rounded corners', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('rounded-lg');
    });

    it('should have padding', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('p-8');
    });

    it('should have shadow', () => {
      renderWithRouter(<PlanCard {...defaultProps} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('shadow-sm');
    });

    it('should have border on non-featured cards', () => {
      renderWithRouter(<PlanCard {...defaultProps} featured={false} />);

      const card = screen.getByText('Pro').closest('div');
      expect(card).toHaveClass('border');
    });
  });
});
