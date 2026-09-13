# Enterprise readiness audit — Motive Fashion

Re-reviewed **8 Sep 2026** after the Access console refactor (tabs, tables, modals), hidden platform super-admin, Ireland checkout (Eircode, delivery/collection), branded receipts, and the customer `/user` workspace.

**Verdict:** Code P0s are still closed. Super-admin Access is now operable without exposing the platform principal. Remaining engineering: email verify, one fetch client, migration checksum. Ops: Resend, solicitor, hosted DB + worker. Square is optional hardware.

| Status | Count |
| --- | --- |
| Fixed | 47 |
| Partial | 15 |
| Open | 3 |
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
- Access UI: Users / Roles / Permissions as tabs + tables; create/edit in modals (not an inline checkbox grid)
- Roles and permission labels are customizable; built-in catalog keys cannot be deleted
- Platform super-admin role (`super-admin`) and that user are hidden; cannot be created, assigned, or deleted from the UI
- Locked keys `*` and `dashboard.super` cannot be granted to other roles
- RBAC mutations (roles, permissions, user-role assign) write `auditLog`
- Default Staff role has no `catalog.write` (pricing stays off the shop floor unless Access grants it)
- Ireland fulfilment: Delivery + Collection, 26 counties, Eircode required, card-only on public web, guest checkout
- Branded HTML/PDF receipts; customer account workspace (`/user`, addresses, orders)
- `packages/types` and `packages/config` SalesChannel match Prisma (`WEB` | `WHATSAPP` | `POS` | `MOBILE`); types package is still unused by app code
- Access API catalog and OpenAPI include permission CRUD; super-admin is documented as hidden/locked
- POS till: category catalogue + size modal, sticky sale pane, cash or card, collect/delivery, coupon, email receipt, Epson print

## Partial

Admin products/orders pages are still thin (inventory now has adjust/transfer). The POS till is a cash-or-card walk-in screen (card uses Stripe Checkout). Rate limit is in-memory. Headers without helmet (custom `securityHeaders` only); CSRF is SameSite=Lax + BFF. Worker is not a Compose service. CI has typecheck + lint + unit tests, not e2e. Cookie banner has reject, no consent-version table. Resend is wired, S3 unused. Request IDs, no APM. Catalog `take: 48`, no cursor. Mobile is a working channel prototype. Stock race tests are in-process CAS, not Postgres. Dockerfiles exist; Compose is still Postgres + Redis only. Legal copy is not solicitor-reviewed. Audit log covers main admin writes plus RBAC; there is no audit UI, and not every procurement field change is logged. Extra permission keys stored in the DB do not unlock a screen until the product starts checking that key.

## Still open

- `emailVerified` column unused (no verify-email flow)
- Split fetch clients (`api()` vs raw `fetch`)
- Init migration checksum (edited after apply)

## Next (implement)

1. **Shared client** — one typed API client on web (replace remaining raw `fetch`).
2. **Auth completeness** — `emailVerified` send/confirm (guest checkout can stay optional).
3. **Hardening** — Redis rate limit, helmet, cursor pagination, worker in Compose, Postgres stock tests, e2e smoke.
4. **Access follow-up** — audit log screen for role/permission changes; a second break-glass super-admin only via ops/seed, never from this UI.

## Next (ops, not more product code)

1. Resend API key so paid-order email actually sends (restart API after).
2. Solicitor review of legal pages; confirm CRO/VAT with ireland.md.
3. Hosted Postgres + Redis + API + worker; backups.
4. S3/R2 only if you stop shipping photos from `apps/web/public`.
5. WhatsApp Cloud credentials only if that channel is on. Skip Square unless you buy terminals.
6. Demo / ops login is `superadmin@motivefashion.com` (seed). Public support is `hello@motivefashion.com`. Existing databases still need a one-row email update or a re-seed; do not wipe production users to pick up the address.
