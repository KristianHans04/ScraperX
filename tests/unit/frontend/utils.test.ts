/**
 * Unit tests for frontend utility functions
 */

import { describe, it, expect } from 'vitest';
import {
  cn,
  formatDate,
  formatDateTime,
  formatNumber,
  formatCurrency,
  formatBytes,
  formatDuration,
  truncate,
  getInitials,
} from '../../../src/frontend/lib/utils.js';

describe('Frontend Utilities', () => {
  describe('cn (className utility)', () => {
    it('should merge class names correctly', () => {
      const result = cn('class1', 'class2');
      expect(result).toBe('class1 class2');
    });

    it('should handle conditional classes', () => {
      const isActive = true;
      const result = cn('base', isActive && 'active');
      expect(result).toBe('base active');
    });

    it('should filter out falsy values', () => {
      const result = cn('class1', false && 'class2', null, undefined, 'class3');
      expect(result).toBe('class1 class3');
    });

    it('should handle object syntax', () => {
      const result = cn({ active: true, disabled: false });
      expect(result).toBe('active');
    });

    it('should merge tailwind classes correctly', () => {
      const result = cn('px-2 py-1', 'px-4');
      expect(result).toBe('py-1 px-4');
    });
  });

  describe('formatDate', () => {
    it('should format date string correctly', () => {
      const date = '2024-03-15T10:30:00Z';
      const result = formatDate(date);
      expect(result).toMatch(/Mar 15, 2024/);
    });

    it('should format Date object correctly', () => {
      const date = new Date('2024-03-15T10:30:00Z');
      const result = formatDate(date);
      expect(result).toMatch(/Mar 15, 2024/);
    });

    it('should handle different date formats', () => {
      const result = formatDate('2024-12-25');
      expect(result).toMatch(/Dec 25, 2024/);
    });

    it('should handle unix timestamp', () => {
      const timestamp = 1700000000000;
      const result = formatDate(new Date(timestamp));
      expect(result).toBeTruthy();
    });
  });

  describe('formatDateTime', () => {
    it('should format date with time', () => {
      const date = '2024-03-15T14:30:00Z';
      const result = formatDateTime(date);
      expect(result).toMatch(/Mar 15, 2024/);
      expect(result).toMatch(/:\d{2}/); // Should contain time
    });

    it('should format Date object with time', () => {
      const date = new Date('2024-03-15T14:30:00Z');
      const result = formatDateTime(date);
      expect(result).toMatch(/Mar 15, 2024/);
    });

    it('should include hours and minutes', () => {
      const date = '2024-03-15T09:05:00Z';
      const result = formatDateTime(date);
      // Should contain time portion
      expect(result).toContain(':');
    });
  });

  describe('formatNumber', () => {
    it('should format integer with commas', () => {
      expect(formatNumber(1000)).toBe('1,000');
      expect(formatNumber(1000000)).toBe('1,000,000');
    });

    it('should format decimal numbers', () => {
      expect(formatNumber(1234.56)).toBe('1,234.56');
    });

    it('should handle zero', () => {
      expect(formatNumber(0)).toBe('0');
    });

    it('should handle negative numbers', () => {
      expect(formatNumber(-5000)).toBe('-5,000');
    });

    it('should handle large numbers', () => {
      expect(formatNumber(1234567890)).toBe('1,234,567,890');
    });
  });

  describe('formatCurrency', () => {
    it('should format USD currency', () => {
      expect(formatCurrency(100)).toBe('$100.00');
      expect(formatCurrency(99.99)).toBe('$99.99');
    });

    it('should format with cents', () => {
      expect(formatCurrency(0.99)).toBe('$0.99');
    });

    it('should format large amounts', () => {
      expect(formatCurrency(1000000)).toBe('$1,000,000.00');
    });

    it('should format zero', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });

    it('should format negative amounts', () => {
      expect(formatCurrency(-50)).toBe('-$50.00');
    });
  });

  describe('formatBytes', () => {
    it('should format bytes', () => {
      expect(formatBytes(0)).toBe('0 B');
      expect(formatBytes(500)).toBe('500.00 B');
    });

    it('should format kilobytes', () => {
      expect(formatBytes(1024)).toBe('1.00 KB');
      expect(formatBytes(1536)).toBe('1.50 KB');
    });

    it('should format megabytes', () => {
      expect(formatBytes(1024 * 1024)).toBe('1.00 MB');
      expect(formatBytes(5 * 1024 * 1024)).toBe('5.00 MB');
    });

    it('should format gigabytes', () => {
      expect(formatBytes(1024 * 1024 * 1024)).toBe('1.00 GB');
    });

    it('should handle edge cases', () => {
      expect(formatBytes(1)).toBe('1.00 B');
      expect(formatBytes(1023)).toBe('1023.00 B');
    });
  });

  describe('formatDuration', () => {
    it('should format milliseconds', () => {
      expect(formatDuration(500)).toBe('500ms');
      expect(formatDuration(999)).toBe('999ms');
    });

    it('should format seconds', () => {
      expect(formatDuration(1000)).toBe('1s');
      expect(formatDuration(59000)).toBe('59s');
    });

    it('should format minutes and seconds', () => {
      expect(formatDuration(60000)).toBe('1m 0s');
      expect(formatDuration(90000)).toBe('1m 30s');
      expect(formatDuration(3599000)).toBe('59m 59s');
    });

    it('should format hours, minutes', () => {
      expect(formatDuration(3600000)).toBe('1h 0m');
      expect(formatDuration(3661000)).toBe('1h 1m');
      expect(formatDuration(7200000)).toBe('2h 0m');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0ms');
    });

    it('should handle large durations', () => {
      expect(formatDuration(86400000)).toBe('24h 0m');
    });
  });

  describe('truncate', () => {
    it('should truncate long strings', () => {
      expect(truncate('Hello World', 5)).toBe('Hello...');
    });

    it('should not truncate short strings', () => {
      expect(truncate('Hi', 10)).toBe('Hi');
    });

    it('should handle exact length strings', () => {
      expect(truncate('Hello', 5)).toBe('Hello');
    });

    it('should handle empty strings', () => {
      expect(truncate('', 5)).toBe('');
    });

    it('should handle unicode characters', () => {
      expect(truncate('Hello World 🌍', 5)).toBe('Hello...');
    });
  });

  describe('getInitials', () => {
    it('should get initials from first and last name', () => {
      expect(getInitials('John', 'Doe')).toBe('JD');
    });

    it('should handle lowercase names', () => {
      expect(getInitials('jane', 'smith')).toBe('JS');
    });

    it('should handle mixed case', () => {
      expect(getInitials('Mary', 'jane')).toBe('MJ');
    });

    it('should handle single character names', () => {
      expect(getInitials('A', 'B')).toBe('AB');
    });

    it('should return uppercase initials', () => {
      const result = getInitials('robert', 'williams');
      expect(result).toBe(result.toUpperCase());
    });
  });
});
