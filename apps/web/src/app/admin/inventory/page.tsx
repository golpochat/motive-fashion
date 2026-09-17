'use client';

import { InventoryLedger } from '@/components/inventory-ledger';

export default function AdminInventory() {
  return (
    <InventoryLedger description="Warehouse and shop stock. Scan a barcode or SKU. Bins are optional until the room needs them." />
  );
}
