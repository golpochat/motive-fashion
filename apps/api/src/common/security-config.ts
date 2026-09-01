const JWT_PLACEHOLDERS = new Set([
  'dev-only-change-me',
  'change-me-to-a-long-random-secret',
  'change-me',
]);

export function isProduction() {
  return process.env.NODE_ENV === 'production';
}

export function resolveJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error('JWT_SECRET is required');
  }
  if (isProduction() && JWT_PLACEHOLDERS.has(secret)) {
    throw new Error('JWT_SECRET must not be an example placeholder in production');
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
  return key;
}
