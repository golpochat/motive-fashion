'use client';

import Link from 'next/link';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, type SalesChannel } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { DataTable, IconButton, JobCard, RowActions, Td } from '@/components/dashboard-ui';
import { orderItemsLabel, orderRef, orderWhen } from '@/lib/order-display';

export type AccountOrderRow = {
  id: string;
  status: string;
  channel: SalesChannel;
  fulfillment: string;
  totalCents: number;
  createdAt: string;
  items: { title: string; quantity: number }[];
};

export function AccountOrdersTable({
  orders,
  compact,
}: {
  orders: AccountOrderRow[];
  compact?: boolean;
}) {
  const rows = compact ? orders.slice(0, 5) : orders;

  return (
    <>
      <DataTable
        headers={['Order', 'Placed', 'Items', 'Fulfilment', 'Status', 'Total', 'Action']}
        cards={rows.map((order) => (
          <JobCard
            key={order.id}
            href={`/user/orders/${order.id}`}
            title={orderRef(order.id)}
            meta={`${orderWhen(order.createdAt)} · ${ORDER_STATUS_LABEL[order.status] ?? order.status}`}
            actions={
              <RowActions>
                <IconButton label="View order" icon="open" href={`/user/orders/${order.id}`} />
              </RowActions>
            }
          >
            <p className="mt-2 text-sm">{orderItemsLabel(order.items)}</p>
            <p className="mt-1 text-xs text-ink/55">
              {CHANNEL_LABEL[order.channel] ?? order.channel} ·{' '}
              {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'} · {formatEur(order.totalCents)}
            </p>
          </JobCard>
        ))}
      >
        {rows.map((order) => (
          <tr key={order.id} className="hover:bg-ink/5">
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
      {compact && orders.length > 5 ? (
        <p className="mt-3 text-sm">
          <Link href="/user/orders" className="no-underline">
            View all orders
          </Link>
        </p>
      ) : null}
    </>
  );
}
