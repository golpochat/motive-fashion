import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { NestFactory } from '@nestjs/core';
import type { INestApplication } from '@nestjs/common';
import Stripe from 'stripe';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/common/configure-app';
import { PrismaService } from '../src/prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';

function applyEnvFile(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, 'utf8').split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = value;
  }
}

applyEnvFile(resolve(__dirname, '../.env'));

process.env.STRIPE_WEBHOOK_SECRET ||= 'whsec_smoke_local';
process.env.LOG_SERVICE ??= 'api-smoke';

type Json = Record<string, unknown>;

async function pingDatabase() {
  if (!process.env.DATABASE_URL || !process.env.JWT_SECRET) return false;
  try {
    const { PrismaClient } = await import('../generated/prisma');
    const prisma = new PrismaClient();
    await prisma.$queryRaw`SELECT 1`;
    await prisma.$disconnect();
    return true;
  } catch {
    return false;
  }
}

async function json(base: string, path: string, init: RequestInit & { token?: string } = {}) {
  const headers = new Headers(init.headers);
  if (init.body && !headers.has('content-type')) headers.set('content-type', 'application/json');
  if (init.token) headers.set('authorization', `Bearer ${init.token}`);
  const res = await fetch(`${base}${path}`, { ...init, headers });
  const text = await res.text();
  let body: Json | Json[] | string | null = null;
  if (text) {
    try {
      body = JSON.parse(text) as Json;
    } catch {
      body = text;
    }
  }
  if (!res.ok) {
    throw new Error(`${init.method ?? 'GET'} ${path} → ${res.status} ${text}`);
  }
  return { res, body };
}

describe('commerce HTTP smoke', { timeout: 120_000 }, () => {
  let app: INestApplication | undefined;
  let base = '';
  let skip = '';

  beforeAll(async () => {
    if (!(await pingDatabase())) {
      skip = process.env.CI ? 'Postgres is required in CI' : 'no local Postgres/JWT — skipping smoke';
      if (process.env.CI) throw new Error(skip);
      return;
    }
    app = await NestFactory.create(AppModule, { rawBody: true, logger: false });
    configureApp(app, { jsonLogs: false });
    await app.listen(0, '127.0.0.1');
    const addr = app.getHttpServer().address();
    const port = typeof addr === 'object' && addr ? addr.port : 0;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(async () => {
    await app?.close();
  });

  it('register → checkout → webhook → pack → refund', async () => {
    if (skip) return;
    if (!app) throw new Error('API did not boot');

    const health = await json(base, '/api/v1/health');
    expect(health.res.ok).toBe(true);
    expect(health.res.headers.get('x-request-id')).toBeTruthy();

    const metrics = await json(base, '/api/v1/health/metrics');
    expect(metrics.res.ok).toBe(true);
    expect((metrics.body as Json).uptimeSec).toBeGreaterThanOrEqual(0);

    const email = `smoke.${Date.now()}.${randomUUID().slice(0, 8)}@motivefashion.test`;
    const password = 'SmokeTest!2026';
    const registered = await json(base, '/api/v1/auth/register', {
      method: 'POST',
      body: JSON.stringify({
        email,
        password,
        confirmPassword: password,
        name: 'Smoke Buyer',
        gdprConsent: true,
      }),
    });
    expect(registered.res.ok).toBe(true);
    expect((registered.body as Json).needsVerification).toBe(true);

    const prisma = app.get(PrismaService);
    const user = await prisma.user.findUniqueOrThrow({ where: { email } });
    const token = app.get(JwtService).sign({ sub: user.id, typ: 'emailverify' }, { expiresIn: '24h' });
    const verified = await json(base, '/api/v1/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
    expect(verified.res.ok).toBe(true);
    const customerToken = (verified.body as Json).accessToken as string;
    expect(customerToken).toBeTruthy();

    const catalog = await json(base, '/api/v1/catalog/products?limit=24');
    expect(catalog.res.ok).toBe(true);
    const items = ((catalog.body as Json).items ?? catalog.body) as Json[];
    const variant = items
      .flatMap((product) => (product.variants as Json[] | undefined) ?? [])
      .find((row) => Number(row.available) > 0);
    expect(variant?.id).toBeTruthy();

    const cartRes = await json(base, '/api/v1/cart', { token: customerToken });
    expect(cartRes.res.ok).toBe(true);
    const cartId = (cartRes.body as Json).id as string;

    const added = await json(base, `/api/v1/cart/${cartId}/items`, {
      method: 'POST',
      token: customerToken,
      body: JSON.stringify({ variantId: variant!.id, quantity: 1 }),
    });
    expect(added.res.ok).toBe(true);

    const checkout = await json(base, '/api/v1/checkout/session', {
      method: 'POST',
      token: customerToken,
      body: JSON.stringify({
        cartId,
        fulfillment: 'DELIVERY',
        email,
        name: 'Smoke Buyer',
        paymentMethod: 'CARD',
        returnPolicyAck: true,
        address: {
          line1: '1 Grafton Street',
          city: 'Dublin',
          county: 'DUBLIN',
          eircode: 'D02 AF30',
        },
      }),
    });
    expect(checkout.res.ok).toBe(true);
    const order = checkout.body as Json;
    expect(order.status).toBe('PENDING_PAYMENT');
    expect(order.id).toBeTruthy();

    const payload = JSON.stringify({
      id: `evt_smoke_${randomUUID()}`,
      object: 'event',
      type: 'checkout.session.completed',
      data: {
        object: {
          id: `cs_smoke_${randomUUID().replace(/-/g, '')}`,
          object: 'checkout.session',
          metadata: { orderId: order.id },
        },
      },
    });
    const signature = Stripe.webhooks.generateTestHeaderString({
      payload,
      secret: process.env.STRIPE_WEBHOOK_SECRET as string,
    });
    const webhook = await fetch(`${base}/api/v1/webhooks/stripe`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'stripe-signature': signature },
      body: payload,
    });
    expect(webhook.ok).toBe(true);
    expect(await webhook.json()).toEqual({ ok: true });

    const paid = await prisma.order.findUniqueOrThrow({ where: { id: order.id as string } });
    expect(paid.status).toBe('CONFIRMED');

    const adminLogin = await json(base, '/api/v1/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email: 'admin@motivefashion.com', password: 'MotiveAdmin!2026' }),
    });
    expect(adminLogin.res.ok).toBe(true);
    const adminToken = (adminLogin.body as Json).accessToken as string;
    expect(adminToken).toBeTruthy();

    const packed = await json(base, `/api/v1/admin/orders/${order.id}/status`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ status: 'PACKING' }),
    });
    expect(packed.res.ok).toBe(true);
    expect((packed.body as Json).status).toBe('PACKING');

    const refunded = await json(base, `/api/v1/admin/orders/${order.id}/refund`, {
      method: 'POST',
      token: adminToken,
      body: JSON.stringify({ amountCents: paid.totalCents, reason: 'Smoke test refund' }),
    });
    expect(refunded.res.ok).toBe(true);
    expect((refunded.body as Json).status).toBe('REFUNDED');
  });
});
