'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

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
      <p>
        Sign in as staff at <a href="/account">/account</a> (seed: hello@motivefashion.ie).
      </p>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Analytics</h1>
      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Stat label="Revenue" value={formatEur(data.revenueCents)} />
        <Stat label="Orders" value={String(data.orderCount)} />
        <Stat label="Low stock rows" value={String(data.stockouts)} />
      </div>
      <h2 className="mt-8 font-serif text-xl">Channels</h2>
      <ul>
        {data.byChannel.map((c) => (
          <li key={c.channel}>
            {c.channel}: {c._count} / {formatEur(c._sum.totalCents ?? 0)}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-ink/10 p-4">
      <p className="text-sm text-ink/60">{label}</p>
      <p className="font-serif text-2xl">{value}</p>
    </div>
  );
}
