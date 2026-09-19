'use client';

import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { DataTable, IconButton, JobCard, RowActions, Td } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';
import { seesAllStaffSales } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';
import type { StaffSale } from '@/app/staff/orders/page';

export default function StaffHome() {
  const { me } = useSession();
  const storeWide = seesAllStaffSales(me);
  const salesQ = useConsoleQuery<StaffSale[]>('/staff/orders', 'Could not load till sales');
  const stockQ = useConsoleQuery<{ onHand: number; reserved: number }[]>('/admin/inventory', 'Could not load stock levels');
  const loading = salesQ.loading || stockQ.loading;
  const error = salesQ.error || stockQ.error;
  const sales = salesQ.data ?? [];
  const levels = stockQ.data ?? [];
  const take = sales.reduce((sum, row) => sum + row.totalCents, 0);
  const low = levels.filter((l) => l.onHand - l.reserved <= 5).length;
  const recent = sales.slice(0, 8);

  return (
    <div>
      <PageHeader title="Overview" description="Till, your sales, pack bench, and stock." />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={() => {
          salesQ.reload();
          stockQ.reload();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="My till sales" value={String(sales.length)} />
          <StatCard label="My take" value={formatEur(take)} hint="This register" />
          <StatCard label="Low stock rows" value={String(low)} hint="Free ≤ 5" />
        </div>
        <h2 className="mt-10 font-serif text-2xl [[data-theme=staff]_&]:font-sans">Recent till sales</h2>
        <div className="mt-3">
          {recent.length === 0 ? (
            <p className="text-sm text-ink/70">Sales you take on POS will appear here.</p>
          ) : (
            <DataTable
              headers={
                storeWide
                  ? ['Ticket', 'When', 'Staff', 'Customer', 'Total', 'Action']
                  : ['Ticket', 'When', 'Customer', 'Total', 'Action']
              }
              cards={recent.map((order) => (
                <JobCard
                  key={order.id}
                  href={`/staff/orders/${order.id}`}
                  title={order.ticket}
                  meta={`${new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })} · ${formatEur(order.totalCents)}`}
                >
                  <p className="mt-2 text-sm">{order.name}</p>
                </JobCard>
              ))}
            >
              {recent.map((order) => (
                <tr key={order.id} className="hover:bg-ink/5">
                  <Td>
                    <Link href={`/staff/orders/${order.id}`} className="font-mono text-xs">
                      {order.ticket}
                    </Link>
                    <span className="mt-1 block text-xs text-ink/45">{ORDER_STATUS_LABEL[order.status] ?? order.status}</span>
                  </Td>
                  <Td muted>{new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
                  {storeWide ? <Td muted>{order.cashierName ?? 'Till'}</Td> : null}
                  <Td>
                    {order.name}
                    <span className="mt-1 block text-xs text-ink/45">{order.email ?? 'Walk-in'}</span>
                  </Td>
                  <Td>{formatEur(order.totalCents)}</Td>
                  <Td nowrap>
                    <RowActions>
                      <IconButton label="View ticket" icon="open" href={`/staff/orders/${order.id}`} />
                    </RowActions>
                  </Td>
                </tr>
              ))}
            </DataTable>
          )}
        </div>
      </ConsoleSection>
    </div>
  );
}
