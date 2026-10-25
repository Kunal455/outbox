import { describe, it, expect } from 'vitest';
import { encrypt, decrypt } from '../src/utils/crypto';

describe('AES-256 Cryptographic Token Security', () => {
  it('encrypts and decrypts a sensitive token reliably', () => {
    const sensitiveToken = 'mock-sensitive-token-sample-12345';
    const encrypted = encrypt(sensitiveToken);

    expect(encrypted).not.toEqual(sensitiveToken);
    expect(encrypted.split(':').length).toBe(3); // iv:tag:ciphertext

    const decrypted = decrypt(encrypted);
    expect(decrypted).toBe(sensitiveToken);
  });

  it('produces different ciphertexts for the same plaintext due to random IVs', () => {
    const token = 'slack-secret-token';
    const enc1 = encrypt(token);
    const enc2 = encrypt(token);

    expect(enc1).not.toBe(enc2);
    expect(decrypt(enc1)).toBe(token);
    expect(decrypt(enc2)).toBe(token);
  });

  it('fails safely when decrypting malformed ciphertext', () => {
    expect(() => decrypt('malformed-string-without-colons')).toThrow();
  });
});
