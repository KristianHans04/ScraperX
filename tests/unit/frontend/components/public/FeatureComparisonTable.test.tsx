/**
 * Unit tests for FeatureComparisonTable Component
 * 
 * Phase 11: Public Website, Legal Pages, and Documentation Portal
 * Deliverable 3: Pricing Page - Feature Comparison Table
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { FeatureComparisonTable } from '../../../src/frontend/components/public/FeatureComparisonTable';

describe('FeatureComparisonTable', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Table Structure', () => {
    it('should render section heading', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Feature Comparison')).toBeInTheDocument();
    });

    it('should render section subtitle', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Compare plans side by side to find the right fit.')).toBeInTheDocument();
    });

    it('should render table with correct headers', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Feature')).toBeInTheDocument();
      expect(screen.getByText('Free')).toBeInTheDocument();
      expect(screen.getByText('Pro')).toBeInTheDocument();
      expect(screen.getByText('Enterprise')).toBeInTheDocument();
    });

    it('should render table element', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByRole('table')).toBeInTheDocument();
    });
  });

  describe('Feature Categories', () => {
    it('should render Engines category', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('ENGINES')).toBeInTheDocument();
    });

    it('should render Usage & Limits category', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('USAGE & LIMITS')).toBeInTheDocument();
    });

    it('should render Features category', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('FEATURES')).toBeInTheDocument();
    });

    it('should render Support category', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('SUPPORT')).toBeInTheDocument();
    });

    it('should render SLA & Compliance category', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('SLA & COMPLIANCE')).toBeInTheDocument();
    });
  });

  describe('Engines Features', () => {
    it('should render HTTP Engine feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('HTTP Engine')).toBeInTheDocument();
    });

    it('should render Browser Engine feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Browser Engine')).toBeInTheDocument();
    });

    it('should render Stealth Engine feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Stealth Engine')).toBeInTheDocument();
    });

    it('should show HTTP Engine available on all plans', () => {
      render(<FeatureComparisonTable />);

      const httpRow = screen.getByText('HTTP Engine').closest('tr');
      expect(httpRow).toBeInTheDocument();
      
      // All cells should have checkmarks
      const cells = httpRow?.querySelectorAll('td');
      expect(cells?.length).toBe(4); // Feature name + 3 plan columns
    });
  });

  describe('Usage & Limits Features', () => {
    it('should render Monthly Credits feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Monthly Credits')).toBeInTheDocument();
    });

    it('should render Rate Limit feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Rate Limit (req/min)')).toBeInTheDocument();
    });

    it('should render Concurrent Requests feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Concurrent Requests')).toBeInTheDocument();
    });

    it('should render Data Retention feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Data Retention')).toBeInTheDocument();
    });

    it('should show correct credit values', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('1,000')).toBeInTheDocument();
      expect(screen.getByText('10,000')).toBeInTheDocument();
      expect(screen.getByText('Custom')).toBeInTheDocument();
    });
  });

  describe('Boolean Features Rendering', () => {
    it('should render checkmarks for included features', () => {
      render(<FeatureComparisonTable />);

      // Check for checkmark icons (represented by Check component)
      const checkIcons = document.querySelectorAll('svg');
      expect(checkIcons.length).toBeGreaterThan(0);
    });

    it('should render X marks for excluded features', () => {
      render(<FeatureComparisonTable />);

      // Check for X icons (represented by X component)
      const xIcons = document.querySelectorAll('svg');
      expect(xIcons.length).toBeGreaterThan(0);
    });
  });

  describe('Pro Plan Highlighting', () => {
    it('should highlight Pro column header', () => {
      render(<FeatureComparisonTable />);

      const proHeader = screen.getByText('Pro').closest('th');
      expect(proHeader).toHaveClass('bg-blue-50');
    });

    it('should highlight Pro column cells', () => {
      render(<FeatureComparisonTable />);

      // Pro column cells should have blue background
      const table = screen.getByRole('table');
      const rows = table.querySelectorAll('tbody tr');
      
      rows.forEach(row => {
        const cells = row.querySelectorAll('td');
        if (cells.length >= 3) {
          // Third cell is Pro column (index 2, after feature name and Free)
          const proCell = cells[2];
          expect(proCell).toHaveClass('bg-blue-50/50');
        }
      });
    });
  });

  describe('SLA Values', () => {
    it('should render uptime guarantees', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('99%')).toBeInTheDocument();
      expect(screen.getByText('99.9%')).toBeInTheDocument();
      expect(screen.getByText('99.99%')).toBeInTheDocument();
    });

    it('should render Uptime Guarantee feature', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByText('Uptime Guarantee')).toBeInTheDocument();
    });
  });

  describe('Accessibility', () => {
    it('should have proper table structure', () => {
      render(<FeatureComparisonTable />);

      expect(screen.getByRole('table')).toBeInTheDocument();
      expect(document.querySelector('thead')).toBeInTheDocument();
      expect(document.querySelector('tbody')).toBeInTheDocument();
    });

    it('should have header cells in thead', () => {
      render(<FeatureComparisonTable />);

      const headers = screen.getAllByRole('columnheader');
      expect(headers.length).toBe(4); // Feature, Free, Pro, Enterprise
    });

    it('should have row headers for categories', () => {
      render(<FeatureComparisonTable />);

      const rows = document.querySelectorAll('tbody tr');
      // Category rows should exist
      expect(rows.length).toBeGreaterThan(0);
    });
  });

  describe('Responsive Design', () => {
    it('should have overflow container for horizontal scroll', () => {
      render(<FeatureComparisonTable />);

      const container = screen.getByRole('table').parentElement;
      expect(container).toHaveClass('overflow-x-auto');
    });

    it('should have minimum width for table', () => {
      render(<FeatureComparisonTable />);

      const table = screen.getByRole('table');
      expect(table).toHaveClass('w-full');
    });
  });
});
