import { describe, it, expect } from 'vitest';
import { parseCsvContent, isValidEmail } from '../utils/csv';

describe('CSV Parser & Email Validator', () => {
  describe('isValidEmail', () => {
    it('accepts standard RFC compliant emails', () => {
      expect(isValidEmail('founder@reachinbox.ai')).toBe(true);
      expect(isValidEmail('john.doe+tag@sub.domain.co')).toBe(true);
      expect(isValidEmail('support-team@outboxlabs.com')).toBe(true);
    });

    it('rejects invalid email formats', () => {
      expect(isValidEmail('')).toBe(false);
      expect(isValidEmail('plainaddress')).toBe(false);
      expect(isValidEmail('@missingusername.com')).toBe(false);
      expect(isValidEmail('username@.com')).toBe(false);
      expect(isValidEmail('spaces in@address.com')).toBe(false);
    });
  });

  describe('parseCsvContent', () => {
    it('parses CSV with "email" header and deduplicates identical addresses', async () => {
      const csv = `email,name
alice@reachinbox.ai,Alice
bob@reachinbox.ai,Bob
alice@reachinbox.ai,Alice Duplicate
charlie@outboxlabs.com,Charlie`;

      const result = await parseCsvContent(csv);

      expect(result.validRecipients).toHaveLength(3);
      expect(result.validRecipients).toEqual([
        'alice@reachinbox.ai',
        'bob@reachinbox.ai',
        'charlie@outboxlabs.com'
      ]);
      expect(result.duplicatesRemoved).toBe(1);
      expect(result.invalidCount).toBe(0);
    });

    it('detects alternative header casing like "Email" and "Recipient"', async () => {
      const csv = `Recipient,Company
partner@vc.com,Acme Ventures
lead@saas.io,SaaS Corp`;

      const result = await parseCsvContent(csv);

      expect(result.validRecipients).toEqual(['partner@vc.com', 'lead@saas.io']);
      expect(result.duplicatesRemoved).toBe(0);
    });

    it('skips invalid email addresses and records them in errors', async () => {
      const csv = `email
valid@reachinbox.ai
invalid-email-address
another.valid@reachinbox.ai`;

      const result = await parseCsvContent(csv);

      expect(result.validRecipients).toEqual([
        'valid@reachinbox.ai',
        'another.valid@reachinbox.ai'
      ]);
      expect(result.invalidCount).toBe(1);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it('handles raw lists without headers', async () => {
      const csv = `single@domain.com
second@domain.com`;

      const result = await parseCsvContent(csv);
      expect(result.validRecipients).toContain('single@domain.com');
      expect(result.validRecipients).toContain('second@domain.com');
    });
  });
});
