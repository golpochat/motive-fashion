'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { PageHeader, StatCard, DashCard } from '@/components/page-header';
import { useSession } from '@/components/session-provider';
import { hasPerm } from '@/lib/rbac';

type OrderRow = { id: string; status: string; trackingToken?: string; totalCents?: number };

export default function UserHome() {
  const { me } = useSession();
  const [orders, setOrders] = useState<OrderRow[]>([]);

  useEffect(() => {
    fetch(`${API}/account/orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders);
  }, []);

  if (!me) return null;

  return (
    <div>
      <PageHeader
        title={`Hello, ${me.name}`}
        description={
          hasPerm(me, 'dashboard.staff') || hasPerm(me, 'pos.sale')
            ? 'Personal orders, wishlist, and addresses. Shop-floor tools stay in the sidebar — POS, inventory, packing.'
            : 'Your customer account. Orders, wishlist, profile, and addresses live here.'
        }
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Signed in as" value={me.name} />
        <StatCard label="Orders" value={String(orders.length)} />
        <StatCard label="Workspace" value="Account" hint={me.email} />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {hasPerm(me, 'dashboard.staff') || hasPerm(me, 'pos.sale') ? (
          <DashCard href="/staff/pos" icon="pos" label="POS" body="Open the till — cash or card." />
        ) : null}
        <DashCard href="/user/orders" icon="orders" label="Orders" body="Track purchases and returns." />
        <DashCard href="/user/wishlist" icon="wishlist" label="Wishlist" body="Pieces you saved." />
        <DashCard href="/user/profile" icon="profile" label="Profile" body="Name, email, and phone." />
        <DashCard href="/user/addresses" icon="locations" label="Addresses" body="Ireland delivery addresses and Eircode." />
        <DashCard href="/user/privacy" icon="privacy" label="Privacy" body="Export or delete your data." />
      </div>
      <h2 className="mt-10 font-serif text-2xl">Recent orders</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60">
          No orders yet.{' '}
          <Link href="/shop">Shop modest wear</Link>
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {orders.slice(0, 5).map((o) => (
            <li key={o.id} className="px-5 py-3 text-sm">
              <Link href={`/order/${o.id}${o.trackingToken ? `?token=${o.trackingToken}` : ''}`}>
                {o.id.slice(0, 8)} — {o.status}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
