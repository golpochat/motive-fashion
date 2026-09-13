'use client';

import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';

type OrderRow = { id: string; status: string; trackingToken?: string; channel?: string };

export default function UserOrders() {
  const { data, error, loading, reload } = useConsoleQuery<OrderRow[]>(
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
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {orders.map((o) => (
            <li key={o.id} className="flex min-h-11 items-center justify-between px-5 py-3 text-sm">
              <Link href={`/order/${o.id}${o.trackingToken ? `?token=${o.trackingToken}` : ''}`}>
                {o.id.slice(0, 8)}
              </Link>
              <span className="text-ink/50">
                {o.channel ? `${o.channel} · ` : ''}
                {ORDER_STATUS_LABEL[o.status] ?? o.status}
              </span>
            </li>
          ))}
        </ul>
      </ConsoleSection>
    </div>
  );
}
