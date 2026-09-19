const JWT_PLACEHOLDERS = new Set([
  'dev-only-change-me',
  'change-me-to-a-long-random-secret',
  'change-me',
  'change-me-in-compose',
]);

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  if (isProduction() && (JWT_PLACEHOLDERS.has(secret) || secret.length < 32)) {
    throw new Error('JWT_SECRET must be a random value of at least 32 characters in production');
  }
  return secret;
}

export function mockPaymentsAllowed(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV === 'production') return false;
  return env.ALLOW_MOCK_PAYMENTS === 'true';
}

export function configuredStripeSecret(env: NodeJS.ProcessEnv = process.env) {
  const key = env.STRIPE_SECRET_KEY;
  if (!key || key.includes('...')) return null;
  if (!key.startsWith('sk_test_') && !key.startsWith('sk_live_')) return null;
  return key;
}

function configuredWebhookSecret(env: NodeJS.ProcessEnv) {
  const secret = env.STRIPE_WEBHOOK_SECRET ?? '';
  if (!secret || secret.includes('...')) return null;
  return secret;
}

/**
 * Refuse to boot a production process that would take real orders with
 * placeholder secrets, mock checkout, or missing Stripe/Resend.
 */
export function assertProductionConfig(env: NodeJS.ProcessEnv = process.env) {
  if (env.NODE_ENV !== 'production') return;
  const errors: string[] = [];
  if (!env.DATABASE_URL) errors.push('DATABASE_URL is required');
  if (!env.REDIS_URL) errors.push('REDIS_URL is required');
  const jwt = env.JWT_SECRET ?? '';
  if (!jwt || JWT_PLACEHOLDERS.has(jwt) || jwt.length < 32) {
    errors.push('JWT_SECRET must be a random value of at least 32 characters, not an example');
  }
  if (env.ALLOW_MOCK_PAYMENTS === 'true') errors.push('ALLOW_MOCK_PAYMENTS cannot be true in production');
  if (!configuredStripeSecret(env)) {
    errors.push('STRIPE_SECRET_KEY must be a real sk_test_ or sk_live_ key (not a placeholder)');
  }
  if (!configuredWebhookSecret(env)) errors.push('STRIPE_WEBHOOK_SECRET is required');
  if (!env.RESEND_API_KEY?.trim()) errors.push('RESEND_API_KEY is required so order and verify mail can send');
  const origin = (env.WEB_ORIGIN ?? '').trim();
  if (!origin) errors.push('WEB_ORIGIN is required');
  if (origin && !origin.startsWith('https://') && env.ALLOW_HTTP_ORIGIN !== 'true') {
    errors.push('WEB_ORIGIN must be https (set ALLOW_HTTP_ORIGIN=true only for a local compose stack)');
  }
  if (errors.length) {
    throw new Error(`Production config invalid:\n- ${errors.join('\n- ')}`);
  }
}

const STAFF_WORKSPACE_KEYS = [
  '*',
  'dashboard.super',
  'dashboard.admin',
  'dashboard.staff',
  'rbac.roles.write',
  'rbac.users.assign',
  'pos.sale',
];

export function isStaffWorkspace(keys: string[]) {
  return keys.some((key) => STAFF_WORKSPACE_KEYS.includes(key) || key.startsWith('rbac.'));
}

/** Privileged roles must use TOTP in production unless REQUIRE_STAFF_MFA=false. */
export function staffMfaRequired(env: NodeJS.ProcessEnv = process.env) {
  if (env.REQUIRE_STAFF_MFA === 'false') return false;
  if (env.REQUIRE_STAFF_MFA === 'true') return true;
  return env.NODE_ENV === 'production';
}
