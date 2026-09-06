'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader, StatCard, DashCard } from '@/components/page-header';

type OrderRow = { id: string; status: string };
type Level = { id: string; onHand: number; reserved: number };

export default function StaffHome() {
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    fetch(`${API}/admin/orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders);
    fetch(`${API}/admin/inventory`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLevels);
  }, []);

  const packing = orders.filter((o) => o.status === 'CONFIRMED' || o.status === 'PACKING').length;
  const low = levels.filter((l) => l.onHand - l.reserved <= 5).length;

  return (
    <div>
      <PageHeader
        title="Shop floor"
        description="Staff workspace for the Dublin till, stock moves, packing, and locations. Same inventory ledger as the website."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Open orders" value={String(orders.length)} />
        <StatCard label="Need packing" value={String(packing)} hint="Paid or packing" />
        <StatCard label="Low stock rows" value={String(low)} hint="Free ≤ 5" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <DashCard href="/staff/pos" icon="pos" label="POS" body="Take a walk-in sale." />
        <DashCard href="/staff/inventory" icon="inventory" label="Inventory" body="Adjust and transfer stock." />
        <DashCard href="/staff/orders" icon="orders" label="Orders" body="Pack paid web orders." />
        <DashCard href="/staff/locations" icon="locations" label="Locations" body="Warehouse, shop, pop-up." />
      </div>
    </div>
  );
}
