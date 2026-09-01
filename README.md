# Motive Fashion

Premium modest-wear D2C platform for **Motive Fashion**, Dublin. Single-merchant commerce: Next.js storefront + admin, NestJS API, unified inventory, WhatsApp ordering, Square POS adapter, and Expo customer app.

This is a standalone product — not a marketplace.

## Stack

- Next.js 15 App Router (storefront + `/admin`)
- NestJS REST API (`/api/v1`)
- PostgreSQL + Prisma
- Redis + BullMQ
- Stripe Payment Intents / Checkout
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
pnpm dev:api    # http://localhost:4000/api/v1
pnpm dev:web    # http://localhost:3000
```

Demo staff login after seed: `hello@motivefashion.ie` / `MotiveAdmin!2026`

## Inventory rule

Every channel (web, WhatsApp, POS, mobile) goes through `StockService.reserve / commit / release`. No channel decrements `onHand` directly.

## Documentation

See [`docs/README.md`](docs/README.md).
