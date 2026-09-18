'use client';

import Link from 'next/link';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, type SalesChannel } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { useConsoleQuery } from '@/lib/console-query';
import { orderItemsLabel, orderRef, orderWhen } from '@/lib/order-display';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, IconButton, RowActions, Td } from '@/components/dashboard-ui';

export type AccountOrderRow = {
  id: string;
  status: string;
  channel: SalesChannel;
  fulfillment: string;
  totalCents: number;
  createdAt: string;
  items: { title: string; quantity: number }[];
};

export default function UserOrders() {
  const { data, error, loading, reload } = useConsoleQuery<AccountOrderRow[]>(
    '/account/orders',
    'Could not load your orders',
  );
  const orders = data ?? [];

  return (
    <div>
      <PageHeader title="Orders" description="Purchases on this account, including web, WhatsApp, and in-person." />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={orders.length === 0}
        emptyTitle="No orders yet"
        emptyBody="When you check out, they will appear here."
      >
        <DataTable headers={['Order', 'Placed', 'Items', 'Fulfilment', 'Status', 'Total', 'Action']}>
          {orders.map((order) => (
            <tr key={order.id} className="hover:bg-ink/[0.02]">
              <Td>
                <Link href={`/user/orders/${order.id}`} className="font-mono text-xs no-underline">
                  {orderRef(order.id)}
                </Link>
                <span className="mt-1 block text-xs text-ink/45">{CHANNEL_LABEL[order.channel] ?? order.channel}</span>
              </Td>
              <Td muted>{orderWhen(order.createdAt)}</Td>
              <Td>{orderItemsLabel(order.items)}</Td>
              <Td muted>{order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}</Td>
              <Td>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
              <Td>{formatEur(order.totalCents)}</Td>
              <Td nowrap>
                <RowActions>
                  <IconButton label="View order" icon="open" href={`/user/orders/${order.id}`} />
                </RowActions>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
