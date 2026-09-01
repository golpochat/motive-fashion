'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminOrders() {
  const [rows, setRows] = useState<{ id: string; status: string; channel: string; email: string; totalCents: number }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);

  async function pack(id: string) {
    await fetch(`${API}/admin/orders/${id}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'PACKING' }),
    });
    location.reload();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Orders</h1>
      <ul className="mt-4 space-y-3 text-sm">
        {rows.map((o) => (
          <li key={o.id} className="flex items-center justify-between border-b py-2">
            <span>
              {o.id.slice(0, 8)} · {o.channel} · {o.status} · {o.email}
            </span>
            <button className="rounded-full border px-3 py-1" type="button" onClick={() => pack(o.id)}>
              Pack
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
