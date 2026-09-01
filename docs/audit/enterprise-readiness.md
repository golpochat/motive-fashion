# Enterprise readiness audit — Motive Fashion

Re-reviewed **1 Sep 2026** after P0/P1 remediation, catalog photos, brand pages, and Stripe/email/deploy wiring.

Interactive copy (filters/charts): open the Cursor canvas `enterprise-readiness-audit.canvas.tsx` beside chat.

**Verdict:** P0 code defects from the first pass are closed or reduced to residual ops (Expo SecureStore). Do not take live cards until Stripe test mode is proven (`stripe listen`) and `ALLOW_MOCK_PAYMENTS=false`. Remaining engineering: OpenAPI, types package, email verify, ESLint, stock race tests, Next `middleware.ts`. Remaining ops: Resend key, S3, solicitor copy, hosted Postgres + worker.

| Status | Count |
| --- | --- |
| Fixed | 31 |
| Partial | 16 |
| Open | 12 |
| Open P0 | 0 |

## Fixed (selected)

- Mock pay gated; pay/track require token or owner
- User/GDPR selects (no password hashes)
- WhatsApp + Square webhook signatures; Graph replies
- JWT production boot gate; 15m access + hashed refresh
- Cart session ownership; confirmPaid transaction; Stripe refund
- BFF `/api/v1` rewrite; product photos; DSR UI; AdminGate
- Ready probe; BullMQ worker; Zod 400 filter; error pages

## Partial

Admin is client-gated not middleware. Rate limit is in-memory. Headers without helmet. Worker not in compose. CI has typecheck, not e2e. Cookie banner has reject, no consent-version table. Resend wired, S3 unused. Request IDs, no APM. Mobile session is in-memory. Catalog `take: 48`, no cursor.

## Still open

- `packages/types` vs Prisma enum drift
- No OpenAPI
- `emailVerified` unused
- Mixed Zod vs raw admin bodies
- Split fetch clients
- Admin UI behind API
- Init migration checksum
- Incomplete audit log
- Promo basis-point docs
- Lint echo scripts
- Duplicate WhatsApp broadcast routes
- No `.nvmrc`

## Next

1. Stripe test keys + `stripe listen`
2. Resend key; Next middleware for `/admin`; SecureStore
3. OpenAPI, ESLint, stock race tests, pin Node
4. S3, solicitor review, live WhatsApp/Square, hosted DB + worker
