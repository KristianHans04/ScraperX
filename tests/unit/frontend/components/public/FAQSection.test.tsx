/**
 * Unit tests for FAQSection Component
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 3: Pricing Page - FAQ Accordion
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { FAQSection } from '../../../src/frontend/components/public/FAQSection';

describe('FAQSection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render section heading', () => {
      render(<FAQSection />);

      expect(screen.getByText('Frequently Asked Questions')).toBeInTheDocument();
    });

    it('should render section subtitle', () => {
      render(<FAQSection />);

      expect(screen.getByText('Got questions? We have answers.')).toBeInTheDocument();
    });

    it('should render all 10 FAQ items', () => {
      render(<FAQSection />);

      // Check for all FAQ questions
      expect(screen.getByText('What are credits and how do they work?')).toBeInTheDocument();
      expect(screen.getByText('Can I switch plans at any time?')).toBeInTheDocument();
      expect(screen.getByText('Do unused credits roll over?')).toBeInTheDocument();
      expect(screen.getByText('What happens if I exceed my credit limit?')).toBeInTheDocument();
      expect(screen.getByText('Is there a free trial for paid plans?')).toBeInTheDocument();
      expect(screen.getByText('What payment methods do you accept?')).toBeInTheDocument();
      expect(screen.getByText('How does the stealth engine differ from the browser engine?')).toBeInTheDocument();
      expect(screen.getByText('Do you offer refunds?')).toBeInTheDocument();
      expect(screen.getByText('What kind of support is included?')).toBeInTheDocument();
      expect(screen.getByText('Can I use Scrapifie for commercial purposes?')).toBeInTheDocument();
    });
  });

  describe('Accordion Functionality', () => {
    it('should have all FAQ items collapsed by default', () => {
      render(<FAQSection />);

      // Answers should not be visible by default
      const creditAnswer = screen.queryByText(/Credits are our usage currency/);
      expect(creditAnswer).not.toBeVisible();
    });

    it('should expand FAQ item when clicked', () => {
      render(<FAQSection />);

      const firstQuestion = screen.getByText('What are credits and how do they work?');
      const button = firstQuestion.closest('button');
      
      expect(button).toBeInTheDocument();
      fireEvent.click(button!);

      // Answer should now be visible
      const creditAnswer = screen.getByText(/Credits are our usage currency/);
      expect(creditAnswer).toBeVisible();
    });

    it('should collapse expanded FAQ item when clicked again', () => {
      render(<FAQSection />);

      const firstQuestion = screen.getByText('What are credits and how do they work?');
      const button = firstQuestion.closest('button');
      
      // Expand
      fireEvent.click(button!);
      const creditAnswer = screen.getByText(/Credits are our usage currency/);
      expect(creditAnswer).toBeVisible();

      // Collapse
      fireEvent.click(button!);
      expect(creditAnswer).not.toBeVisible();
    });

    it('should only show one answer at a time (single-open behavior)', () => {
      render(<FAQSection />);

      const firstQuestion = screen.getByText('What are credits and how do they work?');
      const secondQuestion = screen.getByText('Can I switch plans at any time?');
      
      // Expand first
      fireEvent.click(firstQuestion.closest('button')!);
      const firstAnswer = screen.getByText(/Credits are our usage currency/);
      expect(firstAnswer).toBeVisible();

      // Expand second - first should collapse
      fireEvent.click(secondQuestion.closest('button')!);
      const secondAnswer = screen.getByText(/Yes, you can upgrade or downgrade/);
      expect(secondAnswer).toBeVisible();
      expect(firstAnswer).not.toBeVisible();
    });

    it('should toggle correct FAQ item', () => {
      render(<FAQSection />);

      // Click on different FAQ items and verify correct answers appear
      const questions = [
        { q: 'What are credits and how do they work?', a: /Credits are our usage currency/ },
        { q: 'Can I switch plans at any time?', a: /Yes, you can upgrade or downgrade/ },
        { q: 'Do unused credits roll over?', a: /Credits included in your monthly plan/ },
      ];

      questions.forEach(({ q, a }) => {
        const button = screen.getByText(q).closest('button');
        fireEvent.click(button!);
        
        const answer = screen.getByText(a);
        expect(answer).toBeVisible();

        // Collapse for next test
        fireEvent.click(button!);
      });
    });
  });

  describe('Accessibility', () => {
    it('should have aria-expanded attribute on FAQ buttons', () => {
      render(<FAQSection />);

      const firstQuestion = screen.getByText('What are credits and how do they work?');
      const button = firstQuestion.closest('button');
      
      expect(button).toHaveAttribute('aria-expanded', 'false');

      fireEvent.click(button!);
      expect(button).toHaveAttribute('aria-expanded', 'true');
    });

    it('should have button role for FAQ items', () => {
      render(<FAQSection />);

      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThanOrEqual(10); // At least 10 FAQ buttons
    });

    it('should have proper heading hierarchy', () => {
      render(<FAQSection />);

      const sectionHeading = screen.getByRole('heading', { level: 2 });
      expect(sectionHeading).toHaveTextContent('Frequently Asked Questions');

      const faqHeadings = screen.getAllByRole('heading', { level: 3 });
      expect(faqHeadings.length).toBe(10);
    });
  });

  describe('FAQ Content', () => {
    it('should display correct content for credit system FAQ', () => {
      render(<FAQSection />);

      const button = screen.getByText('What are credits and how do they work?').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText(/HTTP requests cost 1 credit/)).toBeInTheDocument();
      expect(screen.getByText(/Browser requests cost 10 credits/)).toBeInTheDocument();
      expect(screen.getByText(/Stealth requests cost 25 credits/)).toBeInTheDocument();
    });

    it('should display correct content for plan switching FAQ', () => {
      render(<FAQSection />);

      const button = screen.getByText('Can I switch plans at any time?').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText(/upgrade or downgrade your plan at any time/)).toBeInTheDocument();
      expect(screen.getByText(/prorated difference/)).toBeInTheDocument();
    });

    it('should display correct content for free trial FAQ', () => {
      render(<FAQSection />);

      const button = screen.getByText('Is there a free trial for paid plans?').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText(/14-day free trial/)).toBeInTheDocument();
    });

    it('should display correct content for refund FAQ', () => {
      render(<FAQSection />);

      const button = screen.getByText('Do you offer refunds?').closest('button');
      fireEvent.click(button!);

      expect(screen.getByText(/30-day money-back guarantee/)).toBeInTheDocument();
    });
  });

  describe('Visual Elements', () => {
    it('should render chevron icons for expand/collapse', () => {
      render(<FAQSection />);

      // Chevron icons should be present (ChevronDown and ChevronUp from lucide-react)
      const buttons = screen.getAllByRole('button');
      buttons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument();
      });
    });

    it('should have appropriate styling classes', () => {
      render(<FAQSection />);

      const section = screen.getByText('Frequently Asked Questions').closest('section');
      expect(section).toHaveClass('py-20');
    });
  });
});
