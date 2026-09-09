# Runbook — Square POS

Motive DB is the system of record. Square is a terminal.

1. Create a `PosDevice` bound to `dublin_shop` (seed: Till 1).
2. Set `SQUARE_WEBHOOK_SIGNATURE_KEY` and `SQUARE_WEBHOOK_NOTIFICATION_URL` to the public `POST /api/v1/webhooks/square` URL.
3. Map Square catalog SKUs 1:1 with `ProductVariant.sku` (seed prefix `MF-`).
4. Sales can also be taken on `/admin/pos` and `/staff/pos`. Browse by category (one page of products, not every size). Size/colour in a modal. Cash or card, collect or Ireland delivery, coupon, email receipt, Epson print.
5. Production refuses unsigned Square callbacks when the signature key is missing.
6. Receipts: `POST /admin/pos/print/:orderId` sends ESC/POS to an Epson TM-T20III. USB: `POS_PRINTER_PORT=COM3` (this PC’s virtual serial). Network: `POS_PRINTER_HOST` on port 9100. Square is not required for printing.
