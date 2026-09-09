'use client';

import { InventoryLedger } from '@/components/inventory-ledger';

export default function StaffInventory() {
  return (
    <InventoryLedger description="Scan a barcode or SKU to look up a row. Adjust and transfer stay on their own tabs." />
  );
}
