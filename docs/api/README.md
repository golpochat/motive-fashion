# REST API (`/api/v1`)

Machine-readable spec: `GET /api/v1/openapi.json` (OpenAPI 3.1). Source: `apps/api/src/openapi.ts`.

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/health/ready` | Postgres + Redis |
| GET | `/openapi.json` | OpenAPI 3.1 |
| GET | `/catalog/categories` | |
| GET | `/catalog/collections` | |
| GET | `/catalog/products` | Query: category, collection, q, occasion, sku |
| GET | `/catalog/products/:slug` | |
| GET | `/cart` | Query cartId / sessionKey |
| POST | `/cart` | Create |
| POST | `/cart/:id/items` | Reserve stock |
| POST | `/checkout/session` | Create order |
| POST | `/checkout/:orderId/pay` | Stripe session or mock |
| GET | `/orders/:id/track` | Tokenised |
| POST | `/webhooks/stripe` | Raw body |
| GET/POST | `/webhooks/whatsapp` | Verify + inbound |
| POST | `/webhooks/square` | Optional Square terminal |

## Auth

`POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout`

Access JWTs last 15 minutes. Refresh tokens are hashed at rest, rotated on use, and revoked on logout.

## Account (JWT)

`GET /account/me` `/account/orders` `/account/wishlist` `/account/gdpr-export` `POST /account/gdpr-delete`

`GET /account/me` includes `roles[]` and `permissions[]` from memberships (not the JWT).

## Access (RBAC)

Permission catalog is closed. Roles are customizable. `*` is super-admin only.

`GET /rbac/permissions` `GET|POST /rbac/roles` `GET|PATCH|DELETE /rbac/roles/:id` `GET /rbac/users` `PUT /rbac/users/:id/roles`

Requires `rbac.roles.write` (assigning users also needs `rbac.users.assign`).

## Admin (permission keys)

Products, inventory, orders, customers, locations, promo codes, analytics, procurement, POS print, WhatsApp broadcast, marketing calendar. Each route uses `RequirePermissions` (for example `analytics.read`, `pos.sale`). Super-admin `*` passes all.

## Stock

`POST /stock/adjust` `POST /stock/transfer` `GET /stock/suggestions`

Reservations use a single `UPDATE ... WHERE ("onHand" - reserved) >= qty` so two checkouts cannot take the last unit.

Promo `PERCENT` values are **basis points** (1000 = 10% off). `FIXED` values are EUR cents.

## Channels

`POST /channels/pos/sales`
