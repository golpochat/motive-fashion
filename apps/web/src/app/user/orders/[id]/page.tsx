'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { OrderReceipt, type TrackedOrder } from '@/app/order/[id]/order-receipt';
import { orderRef } from '@/lib/order-display';

type AccountOrder = TrackedOrder & { trackingToken: string };

export default function UserOrderDetail() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useConsoleQuery<AccountOrder>(
    `/account/orders/${id}`,
    'Could not load this order',
  );

  return (
    <div>
      <p className="mb-4 text-sm">
        <Link href="/user/orders" className="no-underline">
          ← Orders
        </Link>
      </p>
      <PageHeader
        title={data ? `Order ${orderRef(data.id)}` : 'Order'}
        description="Items, totals, tracking, and returns for this purchase."
      />
      <ConsoleSection loading={loading} error={error} onRetry={reload} empty={!loading && !data} emptyTitle="Order not found">
        {data ? <OrderReceipt initial={data} token={data.trackingToken} tone="account" /> : null}
      </ConsoleSection>
    </div>
  );
}
