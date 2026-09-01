# System overview

```mermaid
flowchart TB
  Web[apps/web]
  Mobile[apps/mobile]
  WA[WhatsApp Cloud API]
  POS[Square / tablet POS]
  API[apps/api NestJS]
  Worker[apps/api worker BullMQ]
  Stock[StockService]
  PG[(PostgreSQL)]
  Redis[(Redis)]
  Stripe[Stripe Checkout Sessions]
  Web --> API
  Mobile --> API
  WA --> API
  POS --> API
  API --> Stock
  Stock --> PG
  API --> Redis
  Worker --> Redis
  Worker --> PG
  API --> Stripe
```

Modular monolith. REST `/api/v1`. Admin is part of the same Next.js app at `/admin`.

Redis is the BullMQ backing store for background jobs (stale cart expiry, low-stock scan), not an application cache. Run the worker with `pnpm dev:worker` (or `pnpm --filter @motive-fashion/api start:worker` in production). The HTTP API process does not run those jobs.

Postgres is the source of truth for catalog, carts, orders, and inventory. Every sales channel goes through `StockService`.
