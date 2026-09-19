# Runbook — deploy

## What to host

| Piece | Suggested | Notes |
| --- | --- | --- |
| `apps/web` | Vercel | Set `NEXT_PUBLIC_API_URL=/api/v1`, `API_ORIGIN` to the public API URL, rewrite `/api/v1` or call the API directly with CORS + credentials. |
| `apps/api` | Fly.io / Railway / Render | `node apps/api/dist/main.js`. Health: `/api/v1/health/ready`. |
| Worker | Same image, second process | `node apps/api/dist/worker.js`. Needs Redis. |
| Postgres 16 | Managed EU region | Run `pnpm db:migrate` against it. Never use the Docker desktop volume in production. |
| Redis 7 | Managed | BullMQ. |
| Images | Cloudflare R2 / S3 `eu-west-1` | Until then, `apps/web/public/products`. |

## Build

From the repo root:

```bash
pnpm install --frozen-lockfile
pnpm --filter "./packages/*" build
pnpm --filter @motive-fashion/api exec prisma generate
pnpm --filter @motive-fashion/api build
pnpm --filter @motive-fashion/web build
```

Docker (API):

```bash
docker build -f infra/docker/Dockerfile.api -t motive-fashion-api .
```

## Production env (minimum)

- `NODE_ENV=production`
- `DATABASE_URL`, `REDIS_URL`
- `JWT_SECRET` (32+ random characters, not the example)
- `WEB_ORIGIN` (https storefront)
- `STRIPE_SECRET_KEY` (`sk_test_` on staging, `sk_live_` in production), `STRIPE_WEBHOOK_SECRET`
- `ALLOW_MOCK_PAYMENTS` unset or `false`
- `RESEND_API_KEY`, `EMAIL_FROM`
- Optional: `LEGAL_NAME`, `TRADER_ADDRESS`, `VAT_REGISTERED`, `VAT_NUMBER`
- `ALERT_WEBHOOK_URL` for Slack-compatible 5xx and job-failure posts
- WhatsApp + Square secrets if those channels are on
- `WHATSAPP_VERIFY_TOKEN` not `change-me`

The API and worker **exit on boot** if production secrets are placeholders or Stripe/Resend are missing. That is intentional.

Local `docker compose --profile stack` needs the same secrets (or it will not start). For HTTP on localhost only, set `ALLOW_HTTP_ORIGIN=true`.

## After deploy

1. `GET /api/v1/health/ready` must return database + redis up.
2. Place a test order on Stripe test mode against staging first.
3. Confirm order email, then live keys.
