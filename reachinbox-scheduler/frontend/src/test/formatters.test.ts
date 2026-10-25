import { describe, it, expect } from 'vitest';
import { formatDate, formatDurationMs, formatNumber } from '../utils/formatters';

describe('Formatters', () => {
  it('formats dates safely', () => {
    expect(formatDate(null)).toBe('—');
    expect(formatDate(undefined)).toBe('—');
    expect(formatDate('invalid-date')).toBe('—');
    const formatted = formatDate('2026-10-24T12:00:00Z');
    expect(formatted).toBeTruthy();
    expect(formatted).not.toBe('—');
  });

  it('formats duration in milliseconds and seconds', () => {
    expect(formatDurationMs(500)).toBe('500ms');
    expect(formatDurationMs(950)).toBe('950ms');
    expect(formatDurationMs(2000)).toBe('2.0s');
    expect(formatDurationMs(3500)).toBe('3.5s');
  });

  it('formats numbers with thousand separators', () => {
    expect(formatNumber(100)).toBe('100');
    expect(formatNumber(1000)).toBe('1,000');
    expect(formatNumber(1000000)).toBe('1,000,000');
  });
});
