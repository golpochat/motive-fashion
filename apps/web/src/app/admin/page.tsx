'use client';

import { useEffect, useState } from 'react';
import { formatEur } from '@motive-fashion/utils';
import { API } from '@/lib/api';
import { PageHeader, StatCard } from '@/components/page-header';
import Link from 'next/link';

export default function AdminHome() {
  const [data, setData] = useState<{
    revenueCents: number;
    orderCount: number;
    stockouts: number;
    byChannel: { channel: string; _sum: { totalCents: number | null }; _count: number }[];
    topSkus: { sku: string; title: string; _sum: { quantity: number | null } }[];
  } | null>(null);

  useEffect(() => {
    fetch(`${API}/admin/analytics`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setData);
  }, []);

  if (!data) {
    return (
      <div>
        <PageHeader title="Commerce overview" description="Loading store metrics…" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Commerce overview"
        description="Admin workspace for merchandising, customers, supply, and marketing. Shop-floor till lives under Staff."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Revenue" value={formatEur(data.revenueCents)} hint="Paid and fulfilled" />
        <StatCard label="Orders" value={String(data.orderCount)} />
        <StatCard label="Low stock rows" value={String(data.stockouts)} hint="On hand ≤ 5" />
      </div>
      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-serif text-xl">Channels</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.byChannel.map((c) => (
              <li key={c.channel} className="flex justify-between border-b border-ink/5 py-2">
                <span className="uppercase tracking-wider text-ink/60">{c.channel}</span>
                <span>
                  {c._count} · {formatEur(c._sum.totalCents ?? 0)}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section className="rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-serif text-xl">Top SKUs</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {data.topSkus.map((s) => (
              <li key={s.sku} className="flex justify-between border-b border-ink/5 py-2">
                <span>
                  {s.title}
                  <span className="block text-ink/45">{s.sku}</span>
                </span>
                <span>{s._sum.quantity ?? 0}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
      <div className="mt-8 flex flex-wrap gap-3 text-sm">
        <Link href="/admin/orders" className="rounded-lg border border-ink/15 px-4 py-2 no-underline hover:border-accent">
          Orders
        </Link>
        <Link href="/admin/inventory" className="rounded-lg border border-ink/15 px-4 py-2 no-underline hover:border-accent">
          Inventory
        </Link>
        <Link href="/admin/products" className="rounded-lg border border-ink/15 px-4 py-2 no-underline hover:border-accent">
          Products
        </Link>
        <Link href="/admin/checkout" className="rounded-lg border border-ink/15 px-4 py-2 no-underline hover:border-accent">
          Checkout
        </Link>
        <Link href="/staff" className="rounded-lg border border-ink/15 px-4 py-2 no-underline hover:border-accent">
          Open staff floor
        </Link>
      </div>
    </div>
  );
}
