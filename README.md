# Motive Fashion

Premium modest-wear D2C platform for **Motive Fashion**, Dublin. Single-merchant commerce: Next.js storefront + admin, NestJS API, unified inventory, WhatsApp ordering, Square POS adapter, and Expo customer app.

This is a standalone product — not a marketplace.

## Stack

- Next.js 15 App Router (storefront + `/auth/login`, `/super-admin`, `/admin`, `/staff`, `/user`)
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

Demo logins after seed (emails are already verified; MFA is off):

- Super-admin `superadmin@motivefashion.com` / `MotiveSuper!2026` → `/super-admin`
- Admin `admin@motivefashion.com` / `MotiveAdmin!2026` → `/admin`
- Staff `staff@motivefashion.com` / `MotiveStaff!2026` → `/staff`
- Customer `guest@motivefashion.com` / `MotiveUser!2026` → `/user`

New customer accounts must verify email before they can sign in. If `RESEND_API_KEY` is empty, the API logs the verification link. Authenticator (TOTP) is optional under `/user/profile`. Failed sign-ins lock the email for 15 minutes after 5 attempts when Redis is up.

## Inventory rule

Every channel (web, WhatsApp, POS, mobile) goes through `StockService.reserve / commit / release`. No channel decrements `onHand` directly.

## Documentation

See [`docs/README.md`](docs/README.md).

## Payments

Mock checkout is on in development until you put a real `sk_test_...` in `apps/api/.env` and set `ALLOW_MOCK_PAYMENTS=false`. Production (`NODE_ENV=production`) refuses to start without Stripe, Resend, a 32-character `JWT_SECRET`, and HTTPS `WEB_ORIGIN`. Then:

```bash
stripe listen --forward-to localhost:4000/api/v1/webhooks/stripe
```

See [`docs/runbooks/stripe.md`](docs/runbooks/stripe.md). Go-live: [`docs/runbooks/deploy.md`](docs/runbooks/deploy.md).
