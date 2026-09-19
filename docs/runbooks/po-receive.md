# Runbook — receive a purchase order

1. Mark PO ordered: `POST /admin/procurement/purchase-orders/:id/order`
2. Create inbound shipment with tracking: `POST /admin/procurement/shipments`
3. On goods-in: `POST /admin/procurement/shipments/:id/receive`
   Optional JSON `{ "lines": [{ "lineId": "<uuid>", "quantity": 12 }] }` to receive part of the shipment. Omit the body to receive remaining units on every line.
4. A full receipt marks the PO `RECEIVED`. A partial receipt marks `PARTIALLY_RECEIVED` and keeps the inbound open until the rest arrives. Stock still goes through `StockService.receive`.
