'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/page-header';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';

type OrderRow = { id: string; status: string; trackingToken?: string; channel?: string };

export default function UserOrders() {
  const [orders, setOrders] = useState<OrderRow[] | null>(null);

  useEffect(() => {
    fetch(`${API}/account/orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setOrders);
  }, []);

  return (
    <div>
      <PageHeader title="Orders" description="Purchases on this account, including web, WhatsApp, and in-person." />
      {!orders ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : orders.length === 0 ? (
        <EmptyState title="No orders yet" body="When you check out, they will appear here." />
      ) : (
        <ul className="divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
          {orders.map((o) => (
            <li key={o.id} className="flex items-center justify-between px-5 py-3 text-sm">
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
      )}
    </div>
  );
}
