# Runbook — orders

1. Customer pays (Stripe webhook or mock pay in dev).
2. `OrdersService.confirmPaid` commits reserved stock.
3. Admin `/admin/orders` → Pack (`PACKING`) → Ship or Ready for collection.
4. Customer tracks `/order/:id?token=`.
5. Returns: customer `POST /returns`; admin receives then restocks.
