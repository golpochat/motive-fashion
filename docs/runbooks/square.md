# Runbook — Square POS

Motive DB is the system of record. Square is a terminal.

1. Create a `PosDevice` bound to `dublin_shop` (seed: Till 1).
2. Set `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_NOTIFICATION_URL` to the public `POST /api/v1/webhooks/square` URL.
3. Map Square catalog SKUs 1:1 with `ProductVariant.sku` (seed prefix `MF-`).
4. Sales can also be taken on the tablet PWA `/admin/pos` (`POST /channels/pos/sales`). Prices come from the SKU, not the till payload.
5. Production refuses unsigned Square callbacks when the signature key is missing.
6. Receipts: `POST /admin/pos/print/:orderId` (preview until vendor SDK is wired).
