'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader, StatCard, DashCard } from '@/components/page-header';
import { formatEur } from '@motive-fashion/utils';

type SaleRow = { id: string; totalCents: number };
type Level = { id: string; onHand: number; reserved: number };

export default function StaffHome() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [levels, setLevels] = useState<Level[]>([]);

  useEffect(() => {
    fetch(`${API}/staff/orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setSales);
    fetch(`${API}/admin/inventory`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLevels);
  }, []);

  const take = sales.reduce((sum, row) => sum + row.totalCents, 0);
  const low = levels.filter((l) => l.onHand - l.reserved <= 5).length;

  return (
    <div>
      <PageHeader title="Shop floor" description="Till, your sales, and stock. Packing of web orders lives in Admin." />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="My till sales" value={String(sales.length)} />
        <StatCard label="My take" value={formatEur(take)} hint="This register" />
        <StatCard label="Low stock rows" value={String(low)} hint="Free ≤ 5" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashCard href="/staff/pos" icon="pos" label="POS" body="Take cash or card and print the ticket." />
        <DashCard href="/staff/orders" icon="orders" label="Orders" body="Your sales: details, reprint, email receipt." />
        <DashCard href="/staff/inventory" icon="inventory" label="Inventory" body="Adjust and transfer stock." />
      </div>
    </div>
  );
}
