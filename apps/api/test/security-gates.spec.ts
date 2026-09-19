import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { configuredStripeSecret, mockPaymentsAllowed, assertProductionConfig } from '../src/common/security-config';
import { metaSignatureValid, squareSignatureValid } from '../src/common/webhook-signature';

describe('mock payments gate', () => {
  it('never allows mock pay in production', () => {
    expect(mockPaymentsAllowed({ NODE_ENV: 'production', ALLOW_MOCK_PAYMENTS: 'true' })).toBe(false);
  });

  it('allows mock pay only when explicitly enabled outside production', () => {
    expect(mockPaymentsAllowed({ NODE_ENV: 'development', ALLOW_MOCK_PAYMENTS: 'true' })).toBe(true);
    expect(mockPaymentsAllowed({ NODE_ENV: 'development' })).toBe(false);
  });

  it('ignores placeholder Stripe keys', () => {
    expect(configuredStripeSecret({ STRIPE_SECRET_KEY: 'sk_test_...' })).toBeNull();
    expect(configuredStripeSecret({ STRIPE_SECRET_KEY: 'not-a-key' })).toBeNull();
    expect(configuredStripeSecret({ STRIPE_SECRET_KEY: 'sk_live_abc' })).toBe('sk_live_abc');
  });
});

const productionEnv = {
  NODE_ENV: 'production',
  DATABASE_URL: 'postgresql://motive:motive@127.0.0.1:5432/motive',
  REDIS_URL: 'redis://127.0.0.1:6379',
  JWT_SECRET: 'a'.repeat(32),
  STRIPE_SECRET_KEY: 'sk_test_liveenough',
  STRIPE_WEBHOOK_SECRET: 'whsec_liveenough',
  RESEND_API_KEY: 're_liveenough',
  WEB_ORIGIN: 'https://motivefashion.com',
} as NodeJS.ProcessEnv;

describe('production boot gate', () => {
  it('allows a complete production env', () => {
    expect(() => assertProductionConfig(productionEnv)).not.toThrow();
  });

  it('refuses mock pay, placeholders, and missing Stripe or Resend', () => {
    expect(() => assertProductionConfig({ ...productionEnv, ALLOW_MOCK_PAYMENTS: 'true' })).toThrow(/ALLOW_MOCK_PAYMENTS/);
    expect(() => assertProductionConfig({ ...productionEnv, JWT_SECRET: 'change-me' })).toThrow(/JWT_SECRET/);
    expect(() => assertProductionConfig({ ...productionEnv, STRIPE_SECRET_KEY: 'sk_test_...' })).toThrow(/STRIPE_SECRET_KEY/);
    expect(() => assertProductionConfig({ ...productionEnv, RESEND_API_KEY: '' })).toThrow(/RESEND_API_KEY/);
    expect(() => assertProductionConfig({ ...productionEnv, WEB_ORIGIN: 'http://localhost:3000' })).toThrow(/https/);
  });

  it('does not run outside production', () => {
    expect(() => assertProductionConfig({ NODE_ENV: 'development' })).not.toThrow();
  });
});

describe('webhook signature helpers', () => {
  it('accepts a matching Meta signature', () => {
    const raw = Buffer.from('{"ok":true}');
    const secret = 'app-secret';
    const header = `sha256=${createHmac('sha256', secret).update(raw).digest('hex')}`;
    expect(metaSignatureValid(raw, header, secret)).toBe(true);
    expect(metaSignatureValid(raw, header, 'other')).toBe(false);
  });

  it('accepts a matching Square signature', () => {
    const raw = Buffer.from('{"event_id":"1"}');
    const url = 'http://localhost:4000/api/v1/webhooks/square';
    const key = 'square-key';
    const header = createHmac('sha256', key).update(url + raw.toString('utf8')).digest('base64');
    expect(squareSignatureValid(raw, header, key, url)).toBe(true);
  });
});
