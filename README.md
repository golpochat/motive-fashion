# Motive Fashion

Premium modest-wear D2C platform for **Motive Fashion**, Dublin. Single-merchant commerce: Next.js storefront + admin, NestJS API, unified inventory, WhatsApp ordering, Square POS adapter, and Expo customer app.

This is a standalone product — not a marketplace.

## Stack

- Next.js 15 App Router (storefront + `/super-admin`, `/admin`, `/staff`, `/user`)
- NestJS REST API (`/api/v1`)
- PostgreSQL + Prisma
- Redis + BullMQ
- Stripe Checkout Sessions
- React Native (Expo)

## Monorepo

```
apps/api          NestJS + Prisma + worker
apps/web          Next.js storefront and admin
apps/mobile       Expo customer app
packages/         Shared types, validation, config, utils, UI
docs/             Architecture, API, compliance, business
infra/docker      Postgres + Redis
```

## Quick start

```bash
pnpm install
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
pnpm db:up
pnpm db:migrate
pnpm db:seed
pnpm dev:api     # http://localhost:4000/api/v1
pnpm dev:worker  # BullMQ (cart expiry, low-stock)
pnpm dev:web     # http://localhost:3000
```

Liveness: `GET http://localhost:4000/api/v1/health`  
Readiness (Postgres + Redis): `GET http://localhost:4000/api/v1/health/ready`

Demo logins after seed:

- Super-admin `hello@motivefashion.ie` / `MotiveAdmin!2026` → `/super-admin`
- Staff `floor@motivefashion.ie` / `MotiveStaff!2026` → `/staff`
- Customer `guest@motivefashion.ie` / `MotiveUser!2026` → `/user`

## Inventory rule

Every channel (web, WhatsApp, POS, mobile) goes through `StockService.reserve / commit / release`. No channel decrements `onHand` directly.

## Documentation

See [`docs/README.md`](docs/README.md).

## Payments

Mock checkout is on until you put a real `sk_test_...` in `apps/api/.env` and set `ALLOW_MOCK_PAYMENTS=false`. Then:

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

See [`docs/runbooks/stripe.md`](docs/runbooks/stripe.md). Go-live: [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md).
