'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, type SalesChannel } from '@motive-fashion/config';

type PackOrder = {
  id: string;
  status: string;
  channel: string;
  email: string;
  name: string;
  fulfillment: string;
  createdAt: string;
};

const QUEUE = new Set(['CONFIRMED', 'PACKING']);

export default function StaffPackQueue() {
  const { data, error, loading, reload } = useConsoleQuery<PackOrder[]>(
    '/admin/orders',
    'Could not load orders to pack',
  );
  const rows = useMemo(
    () => (data ?? []).filter((order) => QUEUE.has(order.status)),
    [data],
  );

  return (
    <div>
      <PageHeader
        title="Pack"
        description="Confirmed orders waiting on the pack bench. Scan each SKU before it ships or is collected."
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="Nothing to pack"
        emptyBody="Paid orders appear here at Confirmed or Packing."
      >
        <DataTable headers={['Order', 'Customer', 'Channel', 'Status', '']}>
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-ink/5">
              <Td>
                <span className="font-mono text-xs">{order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}</span>
                <span className="mt-1 block text-xs text-ink/45">
                  {new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}
                </span>
              </Td>
              <Td>
                <span className="block">{order.name}</span>
                <span className="block text-xs text-ink/45">{order.email}</span>
              </Td>
              <Td muted>
                {CHANNEL_LABEL[order.channel as SalesChannel] ?? order.channel}
                <span className="mt-1 block text-xs">
                  {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
                </span>
              </Td>
              <Td muted>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
              <Td>
                <Link href={`/staff/pack/${order.id}`} className="text-sm">
                  Pack station
                </Link>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
