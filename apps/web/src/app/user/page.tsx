'use client';

import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard, DashCard } from '@/components/page-header';
import { useSession } from '@/components/session-provider';

type OrderRow = { id: string; status: string; trackingToken?: string; totalCents?: number };

export default function UserHome() {
  const { me } = useSession();
  const { data, error, loading, reload } = useConsoleQuery<OrderRow[]>(
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
        <StatCard label="Signed in as" value={me.name} />
        <StatCard label="Orders" value={loading ? '…' : String(orders.length)} />
        <StatCard label="Workspace" value="Account" hint={me.email} />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashCard href="/user/orders" icon="orders" label="Orders" body="Track purchases and returns." />
        <DashCard href="/user/wishlist" icon="wishlist" label="Wishlist" body="Pieces you saved." />
        <DashCard href="/user/profile" icon="profile" label="Profile" body="Name, email, and phone." />
        <DashCard href="/user/addresses" icon="locations" label="Addresses" body="Ireland delivery addresses and Eircode." />
        <DashCard href="/user/privacy" icon="privacy" label="Privacy" body="Export or delete your data." />
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
          <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
            {orders.slice(0, 5).map((o) => (
              <li key={o.id} className="px-5 py-3 text-sm">
                <Link href={`/order/${o.id}${o.trackingToken ? `?token=${o.trackingToken}` : ''}`}>
                  {o.id.slice(0, 8)} — {o.status}
                </Link>
              </li>
            ))}
          </ul>
        </ConsoleSection>
      </div>
    </div>
  );
}
