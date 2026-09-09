'use client';

import { InventoryLedger } from '@/components/inventory-ledger';

export default function AdminInventory() {
  return (
    <InventoryLedger description="Warehouse and shop stock. Scan a SKU, then adjust or transfer without leaving the ledger." />
  );
}
