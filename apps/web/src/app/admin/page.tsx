'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { Field, SecondaryButton, fieldClass } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';

type Analytics = {
  revenueCents: number;
  orderCount: number;
  aovCents: number;
  stockouts: number;
  byChannel: { channel: string; _sum: { totalCents: number | null }; _count: number }[];
  byFulfilment: { fulfillment: string; _sum: { totalCents: number | null }; _count: number }[];
  series: { date: string; revenueCents: number; orders: number }[];
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
  { key: 'unpublished', href: '/admin/products?filter=unpublished', one: 'unpublished style', many: 'unpublished styles' },
  { key: 'noPhoto', href: '/admin/products?filter=nophoto', one: 'style without a photo', many: 'styles without photos' },
  { key: 'returns', href: '/admin/returns', one: 'open return', many: 'open returns' },
  { key: 'lowStock', href: '/admin/inventory', one: 'low-stock row', many: 'low-stock rows' },
];

function dublinDay(date = new Date()) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
}

function shiftDay(iso: string, days: number) {
  return new Date(Date.parse(`${iso}T12:00:00.000Z`) + days * 86_400_000).toISOString().slice(0, 10);
}

const FULFILMENT_LABEL: Record<string, string> = {
  DELIVERY: 'Ireland delivery',
  COLLECTION: 'Dublin collection',
};

export default function AdminHome() {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const params = new URLSearchParams();
  if (from) params.set('from', from);
  if (to) params.set('to', to);
  const query = params.toString();
  const { data, error, loading, reload } = useConsoleQuery<Analytics>(
    `/admin/analytics${query ? `?${query}` : ''}`,
    'Could not load store metrics',
  );
  const next = data?.next;
  const jobs = next
    ? JOBS.map((job) => ({ ...job, count: next[job.key] })).filter((job) => job.count > 0)
    : [];
  const seriesMax = useMemo(
    () => Math.max(1, ...(data?.series.map((row) => row.revenueCents) ?? [1])),
    [data?.series],
  );

  function preset(kind: '7d' | '30d' | 'month') {
    const today = dublinDay();
    if (kind === 'month') {
      setFrom(`${today.slice(0, 7)}-01`);
      setTo(today);
      return;
    }
    setFrom(shiftDay(today, kind === '7d' ? -6 : -29));
    setTo(today);
  }

  async function exportCsv() {
    const res = await fetch(`${API}/admin/analytics/export${query ? `?${query}` : ''}`, { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Do these next. Catalogue, customers, fulfilment, and marketing share one Dublin ledger."
        actions={
          <SecondaryButton type="button" onClick={() => void exportCsv()}>
            Export CSV
          </SecondaryButton>
        }
      />
      <div className="mb-4 flex flex-wrap items-end gap-3">
        <Field label="From">
          <input type="date" className={fieldClass} value={from} onChange={(e) => setFrom(e.target.value)} />
        </Field>
        <Field label="To">
          <input type="date" className={fieldClass} value={to} onChange={(e) => setTo(e.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2 pb-0.5">
          <SecondaryButton type="button" onClick={() => preset('7d')}>
            7 days
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => preset('30d')}>
            30 days
          </SecondaryButton>
          <SecondaryButton type="button" onClick={() => preset('month')}>
            This month
          </SecondaryButton>
        </div>
        {from || to ? (
          <button type="button" className="min-h-11 text-sm text-ink/70 underline-offset-4 hover:underline" onClick={() => { setFrom(''); setTo(''); }}>
            All time
          </button>
        ) : (
          <p className="pb-2 text-xs text-ink/45">All-time paid totals. Daily series is the last 30 days unless you pick dates.</p>
        )}
      </div>
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
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Revenue" value={formatEur(data.revenueCents)} hint="Paid and fulfilled" />
              <StatCard label="Orders" value={String(data.orderCount)} />
              <StatCard label="Average order" value={formatEur(data.aovCents)} hint="Revenue ÷ paid orders" />
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
                <h2 className="font-serif text-xl">Collection vs delivery</h2>
                {data.byFulfilment.length === 0 ? (
                  <p className="mt-3 text-sm text-ink/70">No paid orders yet.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.byFulfilment.map((row) => (
                      <li key={row.fulfillment} className="flex justify-between border-b border-ink/10 py-2">
                        <span>{FULFILMENT_LABEL[row.fulfillment] ?? row.fulfillment}</span>
                        <span>
                          {row._count} · {formatEur(row._sum.totalCents ?? 0)}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            </div>
            <div className="mt-8 grid gap-6 lg:grid-cols-2">
              <section className="rounded-2xl border border-ink/10 bg-white p-5">
                <h2 className="font-serif text-xl">Daily paid orders</h2>
                {data.series.every((row) => row.orders === 0) ? (
                  <p className="mt-3 text-sm text-ink/70">No paid orders in this window.</p>
                ) : (
                  <ul className="mt-3 space-y-2 text-sm">
                    {data.series.map((row) => (
                      <li key={row.date}>
                        <div className="flex justify-between gap-3">
                          <span className="text-ink/55">{row.date}</span>
                          <span>
                            {row.orders} · {formatEur(row.revenueCents)}
                          </span>
                        </div>
                        <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-ink/10">
                          <div
                            className={`h-full bg-accent ${row.revenueCents === 0 ? 'w-0' : row.revenueCents >= seriesMax * 0.75 ? 'w-full' : row.revenueCents >= seriesMax * 0.5 ? 'w-3/4' : row.revenueCents >= seriesMax * 0.25 ? 'w-1/2' : 'w-1/4'}`}
                          />
                        </div>
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
              <Link href="/admin/marketing" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Marketing
              </Link>
              <Link href="/admin/coupons" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Coupons
              </Link>
              <Link href="/admin/pos" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                POS
              </Link>
              <Link href="/admin/customers" className="min-h-11 rounded-lg border border-ink/15 px-4 py-2.5 no-underline hover:border-accent">
                Customers
              </Link>
            </div>
          </>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
