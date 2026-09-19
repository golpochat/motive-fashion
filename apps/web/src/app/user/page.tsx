'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { useSession } from '@/components/session-provider';
import { AccountOrdersTable, type AccountOrderRow } from '@/components/account-orders-table';

export default function UserHome() {
  const { me } = useSession();
  const { data, error, loading, reload } = useConsoleQuery<AccountOrderRow[]>(
    '/account/orders',
    'Could not load your orders',
  );
  const orders = data ?? [];

  if (!me) return null;

  return (
    <div>
      <PageHeader
        title={`Hello, ${me.name}`}
        description="Your customer account. Orders, wishlist, profile, and addresses live here."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Orders" value={loading ? '…' : String(orders.length)} />
        <StatCard label="Email" value={me.email} />
        <StatCard label="Phone" value={me.phone?.trim() ? me.phone : '—'} />
      </div>
      <h2 className="mt-10 font-serif text-2xl">Recent orders</h2>
      <div className="mt-3">
        <ConsoleSection
          loading={loading}
          error={error}
          onRetry={reload}
          empty={orders.length === 0}
          emptyTitle="No orders yet"
          emptyBody="When you check out, they will appear here."
        >
          <AccountOrdersTable orders={orders} compact />
        </ConsoleSection>
      </div>
    </div>
  );
}
