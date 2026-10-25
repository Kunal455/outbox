import Papa from 'papaparse';
import { CsvRecipientResult } from '../types';

const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export const MAX_RECIPIENTS = 10000;

export function isValidEmail(email: string): boolean {
  if (!email || typeof email !== 'string') return false;
  const trimmed = email.trim();
  if (trimmed.length > 254) return false;
  return EMAIL_REGEX.test(trimmed);
}

export function parseCsvContent(content: string): Promise<CsvRecipientResult> {
  return new Promise((resolve) => {
    Papa.parse(content, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim(),
      complete: (results) => {
        const seen = new Set<string>();
        const validRecipients: string[] = [];
        let invalidCount = 0;
        let duplicatesRemoved = 0;
        const errors: string[] = [];

        // If no rows found with header or first row was an email, parse as raw rows
        let rows = results.data as any[];
        const headerHasEmail = results.meta.fields && results.meta.fields.some((f) => isValidEmail(f));
        if (rows.length === 0 || !results.meta.fields || results.meta.fields.length === 0 || headerHasEmail) {
          const raw = Papa.parse<string[]>(content, { skipEmptyLines: true });
          rows = (raw.data || []).map((row) => ({ email: row[0] }));
        }

        for (const row of rows) {
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
            if (validRecipients.length >= MAX_RECIPIENTS) {
              errors.push(`Maximum limit of ${MAX_RECIPIENTS} recipients reached. Excess rows ignored.`);
              break;
            }
            seen.add(email);
            validRecipients.push(email);
          }
        }

        resolve({
          validRecipients,
          invalidCount,
          duplicatesRemoved,
          errors
        });
      },
      error: (err: any) => {
        resolve({
          validRecipients: [],
          invalidCount: 0,
          duplicatesRemoved: 0,
          errors: [`CSV Parse Error: ${err.message}`]
        });
      }
    });
  });
}
