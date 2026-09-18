'use client';

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
  next?: {
    pack: number;
    unpublished: number;
    noPhoto: number;
    returns: number;
    lowStock: number;
  };
};

const JOBS: { key: keyof NonNullable<Analytics['next']>; href: string; one: string; many: string }[] = [
  { key: 'pack', href: '/admin/pack', one: 'order to pack', many: 'orders to pack' },
  { key: 'unpublished', href: '/admin/products', one: 'unpublished style', many: 'unpublished styles' },
  { key: 'noPhoto', href: '/admin/products', one: 'style without a photo', many: 'styles without photos' },
  { key: 'returns', href: '/admin/returns', one: 'open return', many: 'open returns' },
  { key: 'lowStock', href: '/admin/inventory', one: 'low-stock row', many: 'low-stock rows' },
];

export default function AdminHome() {
  const { data, error, loading, reload } = useConsoleQuery<Analytics>('/admin/analytics', 'Could not load store metrics');
  const next = data?.next;
  const jobs = next
    ? JOBS.map((job) => ({ ...job, count: next[job.key] })).filter((job) => job.count > 0)
    : [];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Do these next. Catalogue, customers, fulfilment, and marketing share one Dublin ledger."
      />
      <ConsoleSection loading={loading} error={data ? '' : error} onRetry={reload}>
        {data ? (
          <>
            {error ? (
              <p className="mb-4 text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <section className="rounded-2xl border border-ink/10 bg-white p-5">
              <h2 className="font-serif text-xl">Do these next</h2>
              {jobs.length === 0 ? (
                <p className="mt-3 text-sm text-ink/70">Caught up. No pack queue, unpublished styles, missing photos, returns, or low stock.</p>
              ) : (
                <ul className="mt-3 space-y-1">
                  {jobs.map((job) => (
                    <li key={job.key}>
                      <Link href={job.href} className="flex min-h-11 items-center justify-between gap-3 rounded-lg px-2 py-2 no-underline hover:bg-ink/5">
                        <span>
                          {job.count} {job.count === 1 ? job.one : job.many}
                        </span>
                        <span className="text-xs uppercase tracking-wider text-ink/45">Open</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
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
              <Link href="/admin/pack" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Pack
              </Link>
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
