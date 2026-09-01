# REST API (`/api/v1`)

## Public

| Method | Path | Notes |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/catalog/categories` | |
| GET | `/catalog/collections` | |
| GET | `/catalog/products` | Query: category, collection, q, occasion |
| GET | `/catalog/products/:slug` | |
| GET | `/cart` | Query cartId / sessionKey |
| POST | `/cart` | Create |
| POST | `/cart/:id/items` | Reserve stock |
| POST | `/checkout/session` | Create order |
| POST | `/checkout/:orderId/pay` | Stripe session or mock |
| GET | `/orders/:id/track` | Tokenised |
| POST | `/webhooks/stripe` | Raw body |
| GET/POST | `/webhooks/whatsapp` | Verify + inbound |
| POST | `/webhooks/square` | POS events |

## Auth

`POST /auth/register` `POST /auth/login` `POST /auth/logout`

## Account (JWT)

`GET /account/me` `/account/orders` `/account/wishlist` `/account/gdpr-export` `POST /account/gdpr-delete`

## Admin (STAFF/ADMIN)

Products, inventory, orders, customers, locations, promo codes, analytics, procurement, POS print, WhatsApp broadcast, marketing calendar.

## Stock

`POST /stock/adjust` `POST /stock/transfer` `GET /stock/suggestions`

## Channels

`POST /channels/pos/sales`
