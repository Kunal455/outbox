import { parse } from 'csv-parse/sync';
import { CsvParseResult } from '../types';

// RFC 5322 compliant email regex
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const MAX_RECIPIENTS_PER_UPLOAD = 10000;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

/**
 * Parse CSV buffer or string content into validated, deduplicated email addresses.
 */
export function parseRecipientsCsv(content: string | Buffer): CsvParseResult {
  const text = typeof content === 'string' ? content : content.toString('utf-8');
  const errors: string[] = [];

  let records: any[];
  try {
    records = parse(text, {
      columns: true,
      skip_empty_lines: true,
      trim: true
    });
  } catch (err: any) {
    // If header parsing fails, try line-by-line fallback
    try {
      records = parse(text, {
        columns: false,
        skip_empty_lines: true,
        trim: true
      }).map((row: string[]) => ({ email: row[0] }));
    } catch (parseErr: any) {
      return {
        validRecipients: [],
        invalidCount: 0,
        duplicatesRemoved: 0,
        errors: [`CSV Parse Error: ${parseErr.message || 'Malformed CSV format'}`]
      };
    }
  }

  const seen = new Set<string>();
  const validRecipients: string[] = [];
  let invalidCount = 0;
  let duplicatesRemoved = 0;

  for (const row of records) {
    // Search for any column that looks like 'email', 'recipient', 'to', or take the first column
    let emailCandidate = '';

    if (row.email) emailCandidate = row.email;
    else if (row.Email) emailCandidate = row.Email;
    else if (row.EMAIL) emailCandidate = row.EMAIL;
    else if (row.recipient) emailCandidate = row.recipient;
    else if (row.Recipient) emailCandidate = row.Recipient;
    else if (row.to) emailCandidate = row.to;
    else {
      const keys = Object.keys(row);
      if (keys.length > 0) {
        emailCandidate = String(row[keys[0]]);
      }
    }

    const email = emailCandidate ? emailCandidate.trim().toLowerCase() : '';

    if (!email || !isValidEmail(email)) {
      invalidCount++;
      if (errors.length < 5 && email) {
        errors.push(`Invalid email format: "${email}"`);
      }
      continue;
    }

    if (seen.has(email)) {
      duplicatesRemoved++;
    } else {
      if (validRecipients.length >= MAX_RECIPIENTS_PER_UPLOAD) {
        errors.push(`Maximum recipient limit reached (${MAX_RECIPIENTS_PER_UPLOAD}). Subsequent rows ignored.`);
        break;
      }
      seen.add(email);
      validRecipients.push(email);
    }
  }

  return {
    validRecipients,
    invalidCount,
    duplicatesRemoved,
    errors
  };
}
