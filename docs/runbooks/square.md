# Runbook — Square POS

Motive DB is the system of record. Square is a terminal.

1. Create a `PosDevice` bound to `dublin_shop`.
2. Configure Square webhook to `POST /api/v1/webhooks/square`.
3. Map SKUs 1:1 with `ProductVariant.sku`.
4. Sales can also be taken on the tablet PWA `/admin/pos` (`POST /channels/pos/sales`).
5. Receipts: `POST /admin/pos/print/:orderId` (preview until vendor SDK is wired).
