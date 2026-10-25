import { describe, it, expect } from 'vitest';
import { isTransientError } from '../src/services/smtpService';

describe('SMTP Service Transient vs Permanent Failure Classification', () => {
  it('identifies transient errors that should be retried with exponential backoff', () => {
    expect(isTransientError(new Error('Connection ETIMEDOUT to smtp server'))).toBe(true);
    expect(isTransientError(new Error('ECONNRESET'))).toBe(true);
    expect(isTransientError(new Error('greeting never received'))).toBe(true);
    expect(isTransientError({ message: 'Mailbox temporarily unavailable', responseCode: 451 })).toBe(true);
    expect(isTransientError({ message: 'Service not available, closing transmission channel', responseCode: 421 })).toBe(true);
  });

  it('identifies permanent errors that should NOT be retried unnecessarily', () => {
    expect(isTransientError(new Error('550 5.1.1 User unknown'))).toBe(false);
    expect(isTransientError(new Error('553 5.1.3 Invalid recipient address format'))).toBe(false);
    expect(isTransientError(new Error('535 5.7.8 Authentication failed'))).toBe(false);
  });
});
