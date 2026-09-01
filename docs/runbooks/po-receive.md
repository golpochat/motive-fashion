# Runbook — receive a purchase order

1. Mark PO ordered: `POST /admin/procurement/purchase-orders/:id/order`
2. Create inbound shipment with tracking: `POST /admin/procurement/shipments`
3. On goods-in: `POST /admin/procurement/shipments/:id/receive`
4. Remaining line qty is received into the warehouse location via `StockService.receive`.
