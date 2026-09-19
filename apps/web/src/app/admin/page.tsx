'use client';

import { useState } from 'react';
import { API } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { Field, DataTable, IconButton, JobCard, RowActions, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';
import { CHANNEL_LABEL, type SalesChannel } from '@motive-fashion/config';

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
            <section>
              <h2 className="mb-3 font-serif text-xl [[data-theme=admin]_&]:font-sans">Do these next</h2>
              {jobs.length === 0 ? (
                <p className="text-sm text-ink/70">Caught up. No pack queue, unpublished styles, missing photos, returns, or low stock.</p>
              ) : (
                <DataTable
                  headers={['Job', 'Count', 'Action']}
                  cards={jobs.map((job) => (
                    <JobCard
                      key={job.key}
                      href={job.href}
                      title={`${job.count} ${job.count === 1 ? job.one : job.many}`}
                    />
                  ))}
                >
                  {jobs.map((job) => (
                    <tr key={job.key} className="hover:bg-ink/5">
                      <Td>{job.count === 1 ? job.one : job.many}</Td>
                      <Td>{job.count}</Td>
                      <Td nowrap>
                        <RowActions>
                          <IconButton label="Open" icon="open" href={job.href} />
                        </RowActions>
                      </Td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </section>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Revenue" value={formatEur(data.revenueCents)} hint="Paid and fulfilled" />
              <StatCard label="Orders" value={String(data.orderCount)} />
              <StatCard label="Average order" value={formatEur(data.aovCents)} hint="Revenue ÷ paid orders" />
              <StatCard label="Low stock rows" value={String(data.stockouts)} hint="On hand ≤ 5" />
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 font-serif text-xl [[data-theme=admin]_&]:font-sans">Channels</h2>
                {data.byChannel.length === 0 ? (
                  <p className="text-sm text-ink/70">No paid orders yet.</p>
                ) : (
                  <DataTable headers={['Channel', 'Orders', 'Revenue']}>
                    {data.byChannel.map((c) => (
                      <tr key={c.channel} className="hover:bg-ink/5">
                        <Td>
                          {c.channel in CHANNEL_LABEL
                            ? CHANNEL_LABEL[c.channel as SalesChannel]
                            : c.channel}
                        </Td>
                        <Td>{c._count}</Td>
                        <Td>{formatEur(c._sum.totalCents ?? 0)}</Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </section>
              <section>
                <h2 className="mb-3 font-serif text-xl [[data-theme=admin]_&]:font-sans">Collection vs delivery</h2>
                {data.byFulfilment.length === 0 ? (
                  <p className="text-sm text-ink/70">No paid orders yet.</p>
                ) : (
                  <DataTable headers={['Fulfilment', 'Orders', 'Revenue']}>
                    {data.byFulfilment.map((row) => (
                      <tr key={row.fulfillment} className="hover:bg-ink/5">
                        <Td>{FULFILMENT_LABEL[row.fulfillment] ?? row.fulfillment}</Td>
                        <Td>{row._count}</Td>
                        <Td>{formatEur(row._sum.totalCents ?? 0)}</Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </section>
            </div>
            <div className="mt-8 grid gap-8 lg:grid-cols-2">
              <section>
                <h2 className="mb-3 font-serif text-xl [[data-theme=admin]_&]:font-sans">Daily paid orders</h2>
                {data.series.every((row) => row.orders === 0) ? (
                  <p className="text-sm text-ink/70">No paid orders in this window.</p>
                ) : (
                  <DataTable headers={['Date', 'Orders', 'Revenue']}>
                    {data.series.map((row) => (
                      <tr key={row.date} className="hover:bg-ink/5">
                        <Td muted>{row.date}</Td>
                        <Td>{row.orders}</Td>
                        <Td>{formatEur(row.revenueCents)}</Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </section>
              <section>
                <h2 className="mb-3 font-serif text-xl [[data-theme=admin]_&]:font-sans">Top SKUs</h2>
                {data.topSkus.length === 0 ? (
                  <p className="text-sm text-ink/70">No SKU sales yet.</p>
                ) : (
                  <DataTable headers={['SKU', 'Style', 'Qty']}>
                    {data.topSkus.map((s) => (
                      <tr key={s.sku} className="hover:bg-ink/5">
                        <Td>
                          <span className="font-mono text-xs">{s.sku}</span>
                        </Td>
                        <Td>{s.title}</Td>
                        <Td>{s._sum.quantity ?? 0}</Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </section>
            </div>
          </>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
