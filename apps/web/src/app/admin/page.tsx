'use client';

import { API } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { formatEur } from '@motive-fashion/utils';
import Link from 'next/link';

type Analytics = {
  revenueCents: number;
  orderCount: number;
  stockouts: number;
  byChannel: { channel: string; _sum: { totalCents: number | null }; _count: number }[];
  topSkus: { sku: string; title: string; _sum: { quantity: number | null } }[];
};

export default function AdminHome() {
  const { data, error, loading, reload } = useConsoleQuery<Analytics>('/admin/analytics', 'Could not load store metrics');

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Catalogue, customers, fulfilment, and marketing. Web and staff till orders both land in Orders."
      />
      <ConsoleSection loading={loading} error={error} onRetry={reload}>
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Revenue" value={formatEur(data.revenueCents)} hint="Paid and fulfilled" />
              <StatCard label="Orders" value={String(data.orderCount)} />
              <StatCard label="Low stock rows" value={String(data.stockouts)} hint="On hand ≤ 5" />
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-ink/10 bg-white p-5">
                <h2 className="font-serif text-xl">Channels</h2>
                {data.byChannel.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/70">No paid orders yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.byChannel.map((c) => (
                      <li key={c.channel} className="flex justify-between border-b border-ink/10 py-2">
                        <span className="uppercase tracking-wider text-ink/55">{c.channel}</span>
                        <span>
                          {c._count} · {formatEur(c._sum.totalCents ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
              <section className="rounded-2xl border border-ink/10 bg-white p-5">
                <h2 className="font-serif text-xl">Top SKUs</h2>
                {data.topSkus.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/70">No SKU sales yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.topSkus.map((s) => (
                      <li key={s.sku} className="flex justify-between border-b border-ink/10 py-2">
                        <span>
                          {s.title}
                          <span className="block text-ink/45">{s.sku}</span>
                        </span>
                        <span>{s._sum.quantity ?? 0}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className="mt-8 flex flex-wrap gap-3 text-sm">
              <Link href="/admin/orders" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Orders
              </Link>
              <Link href="/admin/inventory" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Inventory
              </Link>
              <Link href="/admin/products" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Products
              </Link>
              <Link href="/admin/checkout" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Checkout
              </Link>
              <Link href="/admin/coupons" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Coupons
              </Link>
              <Link href="/admin/pos" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                POS
              </Link>
            </div>
          </>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
