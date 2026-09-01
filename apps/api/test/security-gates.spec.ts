import { createHmac } from 'crypto';
import { describe, expect, it } from 'vitest';
import { configuredStripeSecret, mockPaymentsAllowed } from '../src/common/security-config';
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
