# Product blueprint — Motive Fashion

Dublin premium modest-wear retailer. Channels share one inventory ledger.

## Channels

1. Website (`apps/web`)
2. WhatsApp Cloud API
3. POS (Square adapter + tablet PWA at `/admin/pos`)
4. Expo customer app (`apps/mobile`)

## Non-goals (v1)

- GraphQL
- Multi-seller marketplace
- Stripe Connect
- Native TikTok/Instagram posting APIs

## Inventory rule

`available = onHand - reserved`. Checkout, WhatsApp, and POS call `StockService.reserve / commit / release` only.

## Launch commerce

- Catalogue, PDP, cart, Stripe (or mock pay in dev), accounts
- Dublin collection + Ireland delivery
- VAT-inclusive EUR
- Admin CRUD for products, inventory, orders
