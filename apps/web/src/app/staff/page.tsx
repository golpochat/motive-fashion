'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, DashCard, PageHeader, StatCard } from '@/components/page-header';
import { formatEur } from '@motive-fashion/utils';

type SaleRow = { id: string; totalCents: number };
type Level = { id: string; onHand: number; reserved: number };

export default function StaffHome() {
  const salesQ = useConsoleQuery<SaleRow[]>('/staff/orders', 'Could not load till sales');
  const stockQ = useConsoleQuery<Level[]>('/admin/inventory', 'Could not load stock levels');
  const loading = salesQ.loading || stockQ.loading;
  const error = salesQ.error || stockQ.error;
  const sales = salesQ.data ?? [];
  const levels = stockQ.data ?? [];
  const take = sales.reduce((sum, row) => sum + row.totalCents, 0);
  const low = levels.filter((l) => l.onHand - l.reserved <= 5).length;

  return (
    <div>
      <PageHeader title="Overview" description="Till, your sales, pack bench, and stock." />
      <ConsoleSection loading={loading} error={error} onRetry={() => { salesQ.reload(); stockQ.reload(); }}>
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="My till sales" value={String(sales.length)} />
          <StatCard label="My take" value={formatEur(take)} hint="This register" />
          <StatCard label="Low stock rows" value={String(low)} hint="Free ≤ 5" />
        </div>
        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <DashCard href="/staff/pos" icon="pos" label="POS" body="Take cash or card and print the ticket." />
          <DashCard href="/staff/pack" icon="pack" label="Pack" body="Scan SKUs on confirmed web and WhatsApp orders." />
          <DashCard href="/staff/orders" icon="orders" label="Orders" body="Your sales: details, reprint, email receipt." />
          <DashCard href="/staff/inventory" icon="inventory" label="Inventory" body="Adjust and transfer stock." />
          <DashCard href="/staff/locations" icon="locations" label="Locations" body="Warehouse, shop floor, and pop-up rooms." />
        </div>
      </ConsoleSection>
    </div>
  );
}
