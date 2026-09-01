# Year 1 procurement calendar

Target **2,810 units**. Seeded as DRAFT purchase orders grouped by month bucket and origin country.

| Bucket | Origin | Mix |
| --- | --- | --- |
| M1–2 | TR, PK, SA, AE, ID, CN | Hijabs 300, dresses 40, abayas 30, jilbabs 40, niqabs 100, premium abayas 20, luxury 20, prayer 20, khimars 20, undercaps 200 |
| M3–4 | TR, PK, SA, ID | Hijabs 300, abayas 40, dresses 20, jilbabs 60, niqabs 100, khimars 30 |
| M5–6 | AE, SA, PK, TR | Luxury 30, premium 20, prayer jilbabs 20, summer dresses 50 |
| M7–8 | TR, ID, CN | Hijabs 300, abayas 40, prayer 20, khimars 20, undercaps 200, magnets 100 |
| M9–10 | ID, SA, AE | Prayer 60, premium 30, niqabs 100, luxury 30 |
| M11–12 | TR, PK, SA | Winter/dresses 60, hijabs 300, jilbabs 60, premium 30 |

Inbound flow: `ordered → in_transit → received` increments `onHand` via `StockService.receive`.

Weekly job: if `onHand + inbound < reorderPoint`, suggest PO lines grouped by supplier country.
