import { describe, expect, it } from 'vitest';
import {
  consumeBackupCode,
  decodeBase32,
  encodeBase32,
  generateBackupCodes,
  hashBackupCode,
  otpauthUri,
  totpAt,
  verifyTotp,
} from '../src/modules/auth/totp';

describe('TOTP', () => {
  it('round-trips base32', () => {
    const raw = Buffer.from('12345678901234567890');
    expect(decodeBase32(encodeBase32(raw)).equals(raw)).toBe(true);
  });

  it('accepts the current code and rejects a wrong one', () => {
    const secret = encodeBase32(Buffer.from('12345678901234567890'));
    const at = Date.UTC(2026, 8, 9, 12, 0, 0);
    const code = totpAt(secret, at);
    expect(code).toMatch(/^\d{6}$/);
    expect(verifyTotp(secret, code, at)).toBe(true);
    expect(verifyTotp(secret, '000000', at)).toBe(false);
  });

  it('accepts one step of clock drift', () => {
    const secret = encodeBase32(Buffer.from('12345678901234567890'));
    const at = Date.UTC(2026, 8, 9, 12, 0, 0);
    const previous = totpAt(secret, at - 30_000);
    expect(verifyTotp(secret, previous, at)).toBe(true);
  });

  it('builds an otpauth URI without a public QR host', () => {
    const uri = otpauthUri('guest@motivefashion.com', 'JBSWY3DPEHPK3PXP');
    expect(uri.startsWith('otpauth://totp/')).toBe(true);
    expect(uri).toContain('secret=JBSWY3DPEHPK3PXP');
    expect(uri).not.toContain('chart.googleapis');
  });

  it('consumes a backup code once', () => {
    const codes = generateBackupCodes(2);
    const hashes = codes.map(hashBackupCode);
    const next = consumeBackupCode(hashes, codes[0]!);
    expect(next).toHaveLength(1);
    expect(consumeBackupCode(next!, codes[0]!)).toBeNull();
  });
});
