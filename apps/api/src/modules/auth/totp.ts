import { createHmac, createHash, randomBytes } from 'crypto';

const BASE32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP = 30;
const DIGITS = 6;

export function encodeBase32(buf: Buffer) {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += BASE32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += BASE32[(value << (5 - bits)) & 31];
  return out;
}

export function decodeBase32(input: string) {
  const clean = input.toUpperCase().replace(/[\s=-]/g, '');
  let bits = 0;
  let value = 0;
  const bytes: number[] = [];
  for (const ch of clean) {
    const idx = BASE32.indexOf(ch);
    if (idx < 0) throw new Error('Invalid secret');
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      bytes.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(bytes);
}

export function randomTotpSecret(bytes = 20) {
  return encodeBase32(randomBytes(bytes));
}

function hotp(secret: Buffer, counter: number) {
  const buf = Buffer.alloc(8);
  buf.writeUInt32BE(Math.floor(counter / 0x1_0000_0000), 0);
  buf.writeUInt32BE(counter >>> 0, 4);
  const hmac = createHmac('sha1', secret).update(buf).digest();
  const offset = hmac[hmac.length - 1]! & 0x0f;
  const bin =
    ((hmac[offset]! & 0x7f) << 24) |
    ((hmac[offset + 1]! & 0xff) << 16) |
    ((hmac[offset + 2]! & 0xff) << 8) |
    (hmac[offset + 3]! & 0xff);
  const mod = 10 ** DIGITS;
  return String(bin % mod).padStart(DIGITS, '0');
}

export function totpAt(secretB32: string, atMs = Date.now()) {
  const counter = Math.floor(atMs / 1000 / STEP);
  return hotp(decodeBase32(secretB32), counter);
}

export function verifyTotp(secretB32: string, code: string, atMs = Date.now(), window = 1) {
  const clean = code.replace(/\s/g, '');
  if (!/^\d{6}$/.test(clean)) return false;
  let secret: Buffer;
  try {
    secret = decodeBase32(secretB32);
  } catch {
    return false;
  }
  const counter = Math.floor(atMs / 1000 / STEP);
  for (let i = -window; i <= window; i++) {
    if (hotp(secret, counter + i) === clean) return true;
  }
  return false;
}

export function otpauthUri(email: string, secret: string) {
  const label = encodeURIComponent(`Motive Fashion:${email}`);
  const issuer = encodeURIComponent('Motive Fashion');
  return `otpauth://totp/${label}?secret=${secret}&issuer=${issuer}&algorithm=SHA1&digits=6&period=30`;
}

export function generateBackupCodes(count = 8) {
  return Array.from({ length: count }, () => randomBytes(5).toString('hex').toUpperCase().slice(0, 10));
}

export function hashBackupCode(code: string) {
  return createHash('sha256').update(code.replace(/\s/g, '').toUpperCase()).digest('hex');
}

export function consumeBackupCode(hashes: string[], code: string) {
  const hashed = hashBackupCode(code);
  const idx = hashes.indexOf(hashed);
  if (idx < 0) return null;
  return hashes.filter((_, i) => i !== idx);
}
