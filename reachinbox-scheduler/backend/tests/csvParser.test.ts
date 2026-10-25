import { describe, it, expect } from 'vitest';
import { parseRecipientsCsv, isValidEmail, MAX_RECIPIENTS_PER_UPLOAD } from '../src/utils/csvParser';

describe('CSV Recipient Parser & RFC 5322 Validation', () => {
  describe('isValidEmail', () => {
    it('accepts standard valid email addresses', () => {
      expect(isValidEmail('user@example.com')).toBe(true);
      expect(isValidEmail('john.doe@company.org')).toBe(true);
      expect(isValidEmail('jane+tag@outboxlabs.ai')).toBe(true);
    });

    it('rejects malformed email strings', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('not-an-email')).toBe(false);
      expect(isValidEmail('@missinguser.com')).toBe(false);
      expect(isValidEmail('missingdomain@')).toBe(false);
      expect(isValidEmail('spaces in@email.com')).toBe(false);
    });
  });

  describe('parseRecipientsCsv', () => {
    it('extracts valid recipients from standard CSV with headers', () => {
      const csv = `name,email,company
Alice,alice@example.com,Acme
Bob,bob@startup.io,TechCorp`;

      const result = parseRecipientsCsv(csv);
      expect(result.validRecipients).toEqual(['alice@example.com', 'bob@startup.io']);
      expect(result.invalidCount).toBe(0);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('handles alternative header names case-insensitively', () => {
      const csv = `Recipient,Role
charlie@outboxlabs.com,Engineer
david@reachinbox.ai,Product`;

      const result = parseRecipientsCsv(csv);
      expect(result.validRecipients).toEqual(['charlie@outboxlabs.com', 'david@reachinbox.ai']);
    });

    it('filters out invalid emails and records invalid count', () => {
      const csv = `email
valid1@example.com
invalid-format
valid2@example.com
@bad-address.com`;

      const result = parseRecipientsCsv(csv);
      expect(result.validRecipients).toEqual(['valid1@example.com', 'valid2@example.com']);
      expect(result.invalidCount).toBe(2);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('deduplicates case-insensitively according to policy', () => {
      const csv = `email
test@example.com
TEST@EXAMPLE.COM
Test@Example.com
unique@example.com`;

      const result = parseRecipientsCsv(csv);
      expect(result.validRecipients).toEqual(['test@example.com', 'unique@example.com']);
      expect(result.duplicatesRemoved).toBe(2);
    });

    it('enforces maximum recipient limit safely', () => {
      let largeCsv = 'email\n';
      for (let i = 0; i < 50; i++) {
        largeCsv += `user${i}@example.com\n`;
      }
      const result = parseRecipientsCsv(largeCsv);
      expect(result.validRecipients.length).toBe(50);
    });

    it('handles buffer input seamlessly', () => {
      const buffer = Buffer.from('email\nbuffer.user@example.com\n');
      const result = parseRecipientsCsv(buffer);
      expect(result.validRecipients).toEqual(['buffer.user@example.com']);
    });
  });
});
