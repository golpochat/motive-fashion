# Enterprise readiness audit — Motive Fashion

Re-reviewed **1 Sep 2026** (late) after staff inventory UI, Zod on remaining admin bodies, single WhatsApp broadcast, and admin audit writes.

Interactive copy (filters/charts): open the Cursor canvas `enterprise-readiness-audit.canvas.tsx` beside chat.

**Verdict:** Code P0s are closed. Staff can adjust/transfer stock in `/admin/inventory`. Remaining engineering: types package, email verify, one fetch client, migration checksum, POS printer. Ops: Resend, solicitor, hosted DB + worker. Square is optional hardware.

| Status | Count |
| --- | --- |
| Fixed | 37 |
| Partial | 15 |
| Open | 5 |
| Open P0 | 0 |

## Fixed (selected)

- Mock pay gated; pay/track require token or owner
- User/GDPR selects (no password hashes)
- WhatsApp + Square webhook signatures; Graph replies
- JWT production boot gate; 15m access + hashed refresh
- Cart session ownership; confirmPaid transaction; Stripe refund
- BFF `/api/v1` rewrite; product photos; DSR UI
- Ready probe; BullMQ worker; Zod 400 filter; error pages
- Next `/admin` middleware (plus client AdminGate)
- Expo SecureStore for access token / cart / session
- OpenAPI 3.1 at `GET /api/v1/openapi.json`
- ESLint in CI (`pnpm lint`)
- Stock reserve is atomic `UPDATE … WHERE (onHand - reserved) >= qty`; commit/transfer row-lock
- Node pinned via `.nvmrc` (20)
- Inventory adjust/transfer UI; Zod on variants/promos/marketing/POS/order mutations
- One WhatsApp broadcast (`POST /admin/whatsapp/broadcast`)
- Audit log on product PATCH, variants, promos, campaigns, calendar, stock transfer, WA broadcast
- Promo PERCENT documented as basis points (1000 = 10%)

## Partial

Admin products/orders pages are still thin (inventory now has adjust/transfer). Rate limit is in-memory. Headers without helmet; CSRF is SameSite=Lax + BFF. Worker is not a Compose service. CI has typecheck + lint + unit tests, not e2e. Cookie banner has reject, no consent-version table. Resend is wired, S3 unused. Request IDs, no APM. Catalog `take: 48`, no cursor. Mobile is a working channel prototype. Stock race tests are in-process CAS, not Postgres. Dockerfiles exist; Compose is still Postgres + Redis only. STAFF can still change pricing. Legal copy is not solicitor-reviewed. Audit log covers the main admin writes; not every procurement field change.

## Still open

- `packages/types` SalesChannel (`web`) vs Prisma (`WEB`)
- `emailVerified` column unused (no verify-email flow)
- Split fetch clients (`api()` vs raw `fetch`)
- Init migration checksum (edited after apply)
- POS print is preview-only

## Next (implement)

1. **Shared contract** — align or delete `packages/types`; one typed API client on web.
2. **Auth completeness** — `emailVerified` send/confirm (guest checkout can stay optional).
3. **Hardening** — Redis rate limit, helmet, cursor pagination, worker in Compose, Postgres stock tests, e2e smoke.

## Next (ops, not more product code)

1. Resend API key so paid-order email actually sends (restart API after).
2. Solicitor review of legal pages; confirm CRO/VAT with ireland.md.
3. Hosted Postgres + Redis + API + worker; backups.
4. S3/R2 only if you stop shipping photos from `apps/web/public`.
5. WhatsApp Cloud credentials only if that channel is on. Skip Square unless you buy terminals.
