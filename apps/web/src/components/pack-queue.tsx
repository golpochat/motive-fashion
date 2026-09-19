'use client';

import { useMemo } from 'react';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, IconButton, JobCard, RowActions, Td } from '@/components/dashboard-ui';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, type SalesChannel } from '@motive-fashion/config';

type PackOrder = {
  id: string;
  status: string;
  channel: string;
  email: string;
  name: string;
  fulfillment: string;
  createdAt: string;
  ticket: string | null;
};

const QUEUE = new Set(['CONFIRMED', 'PACKING']);

export function PackQueue({
  stationHref,
}: {
  stationHref: (orderId: string) => string;
}) {
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
        error={rows.length ? '' : error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="Nothing to pack"
        emptyBody="Paid orders appear here at Confirmed or Packing."
      >
        <DataTable
          headers={['Order', 'Customer', 'Channel', 'Status', 'Action']}
          cards={rows.map((order) => (
            <JobCard
              key={order.id}
              href={stationHref(order.id)}
              title={order.ticket ?? order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
              meta={`${ORDER_STATUS_LABEL[order.status] ?? order.status} · ${order.name}`}
            >
              <p className="mt-2 text-xs text-ink/55">
                {CHANNEL_LABEL[order.channel as SalesChannel] ?? order.channel} ·{' '}
                {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
              </p>
            </JobCard>
          ))}
        >
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-ink/5">
              <Td>
                <span className="font-mono text-xs">
                  {order.ticket ?? order.id.replace(/-/g, '').slice(0, 8).toUpperCase()}
                </span>
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
              <Td nowrap>
                <RowActions>
                  <IconButton label="Pack station" icon="pack" href={stationHref(order.id)} />
                </RowActions>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
