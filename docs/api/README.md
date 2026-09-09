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
| GET | `/checkout/options` | Fulfilment, public payments, county rates |
| POST | `/checkout/quote` | Shipping, promo, totals |
| POST | `/checkout/session` | Create order (guest allowed) |
| POST | `/checkout/:orderId/pay` | Stripe session or mock; public web is card-only |
| GET | `/orders/:id/track` | Tokenised |
| POST | `/webhooks/stripe` | Raw body |
| GET/POST | `/webhooks/whatsapp` | Verify + inbound |
| POST | `/webhooks/square` | Optional Square terminal |

## Auth

`POST /auth/register` `POST /auth/login` `POST /auth/refresh` `POST /auth/logout`

Access JWTs last 15 minutes. Refresh tokens are hashed at rest, rotated on use, and revoked on logout.

## Account (JWT)

`GET /account/me` `/account/orders` `/account/wishlist` `/account/addresses` `/account/gdpr-export` `POST /account/gdpr-delete`

Addresses: `POST /account/addresses` `PATCH /account/addresses/:id` `POST /account/addresses/:id/default` `DELETE /account/addresses/:id`

`GET /account/me` includes `roles[]` and `permissions[]` from memberships (not the JWT).

## Access (RBAC)

Enforced permission **keys** live in code (`PERMISSION_CATALOG`). Labels, groups, and extra keys can be created and edited. Extra keys do not unlock a route until the product starts checking them.

The `super-admin` role and its user are omitted from list endpoints. They cannot be created, assigned, or deleted here. Locked keys `*` and `dashboard.super` cannot be granted to other roles. System roles `admin`, `staff`, and `customer` can be edited but not deleted.

`GET|POST /rbac/permissions` `PATCH|DELETE /rbac/permissions/:id`  
`GET|POST /rbac/roles` `GET|PATCH|DELETE /rbac/roles/:id`  
`GET /rbac/users` `PUT /rbac/users/:id/roles`

Requires `rbac.roles.write`. Listing or assigning users also needs `rbac.users.assign`. Super-admin `*` still passes every gate.

## Admin (permission keys)

Products, inventory, orders, customers, locations, promo codes, analytics, procurement, checkout methods / county rates (`commerce.settings`), POS print, WhatsApp broadcast, marketing calendar. Each route uses `RequirePermissions` (for example `analytics.read`, `pos.sale`). Super-admin `*` passes all. `POST /admin/pos/print/:orderId` sends an ESC/POS ticket to `POS_PRINTER_PORT` (USB COM) or `POS_PRINTER_HOST:9100` and still returns `preview`.

## Stock

`POST /stock/adjust` `POST /stock/transfer` `GET /stock/suggestions`

Reservations use a single `UPDATE ... WHERE ("onHand" - reserved) >= qty` so two checkouts cannot take the last unit.

Promo `PERCENT` values are **basis points** (1000 = 10% off). `FIXED` values are EUR cents.

## Channels

`POST /channels/pos/sales` (staff/admin till: one or more SKU lines; prices from catalogue)
