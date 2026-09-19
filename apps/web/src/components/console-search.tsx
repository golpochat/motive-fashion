'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { Icon } from '@/components/icons';
import { formatEur } from '@motive-fashion/utils';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';

type SearchHit = {
  products: { id: string; title: string; slug: string; published: boolean }[];
  orders: { id: string; ticket: string | null; email: string; name: string; status: string; totalCents: number }[];
  customers: { id: string; name: string; email: string }[];
  coupons: { id: string; code: string; active: boolean }[];
};

const empty: SearchHit = { products: [], orders: [], customers: [], coupons: [] };

export function ConsoleSearch() {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const [hits, setHits] = useState<SearchHit>(empty);

  useEffect(() => {
    const needle = q.trim();
    if (needle.length < 2) {
      setHits(empty);
      return;
    }
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      fetch(`${API}/admin/search?q=${encodeURIComponent(needle)}`, { credentials: 'include', signal: controller.signal })
        .then(async (res) => {
          if (!res.ok) return;
          setHits((await res.json()) as SearchHit);
          setOpen(true);
        })
        .catch(() => undefined);
    }, 180);
    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [q]);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const total = hits.products.length + hits.orders.length + hits.customers.length + hits.coupons.length;

  return (
    <div ref={rootRef} className="relative min-w-0 flex-1 md:max-w-sm">
      <label htmlFor={id} className="sr-only">
        Search orders, SKUs, customers
      </label>
      <Icon name="search" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink/45" />
      <input
        id={id}
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => {
          if (total) setOpen(true);
        }}
        placeholder="Search SKU, order, customer…"
        className="h-9 w-full rounded-lg border border-ink/15 bg-white pl-9 pr-3 text-sm outline-none focus:border-accent"
      />
      {open && q.trim().length >= 2 ? (
        <div className="absolute right-0 z-40 mt-1 w-[min(100vw-2rem,24rem)] overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg">
          {total === 0 ? (
            <p className="px-3 py-3 text-sm text-ink/55">No matches.</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1 text-sm">
              {hits.products.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/products?hub=${row.id}`}
                    className="block px-3 py-2 no-underline hover:bg-ink/5"
                    onClick={() => setOpen(false)}
                  >
                    <span className="block text-[11px] uppercase tracking-wider text-ink/45">Product</span>
                    {row.title}
                    {row.published ? null : <span className="text-ink/45"> · unpublished</span>}
                  </Link>
                </li>
              ))}
              {hits.orders.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/pack/${row.id}`}
                    className="block px-3 py-2 no-underline hover:bg-ink/5"
                    onClick={() => setOpen(false)}
                  >
                    <span className="block text-[11px] uppercase tracking-wider text-ink/45">Order</span>
                    {row.ticket ?? row.id.slice(0, 8)} · {row.name} · {ORDER_STATUS_LABEL[row.status] ?? row.status} ·{' '}
                    {formatEur(row.totalCents)}
                  </Link>
                </li>
              ))}
              {hits.customers.map((row) => (
                <li key={row.id}>
                  <Link
                    href={`/admin/customers/${row.id}`}
                    className="block px-3 py-2 no-underline hover:bg-ink/5"
                    onClick={() => setOpen(false)}
                  >
                    <span className="block text-[11px] uppercase tracking-wider text-ink/45">Customer</span>
                    {row.name}
                    <span className="block text-xs text-ink/45">{row.email}</span>
                  </Link>
                </li>
              ))}
              {hits.coupons.map((row) => (
                <li key={row.id}>
                  <Link
                    href="/admin/coupons"
                    className="block px-3 py-2 no-underline hover:bg-ink/5"
                    onClick={() => setOpen(false)}
                  >
                    <span className="block text-[11px] uppercase tracking-wider text-ink/45">Coupon</span>
                    {row.code}
                    {row.active ? null : <span className="text-ink/45"> · off</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : null}
    </div>
  );
}
