'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { AccountOrdersTable, type AccountOrderRow } from '@/components/account-orders-table';

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
        <AccountOrdersTable orders={orders} />
      </ConsoleSection>
    </div>
  );
}
