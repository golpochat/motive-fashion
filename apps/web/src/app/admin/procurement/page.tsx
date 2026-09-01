'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminProcurement() {
  const [pos, setPos] = useState<{ id: string; monthBucket: string; status: string; supplier: { country: string; name: string } }[]>(
    [],
  );
  useEffect(() => {
    fetch(`${API}/admin/procurement/purchase-orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPos);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Procurement</h1>
      <ul className="mt-4 text-sm">
        {pos.map((p) => (
          <li key={p.id} className="border-b py-2">
            {p.monthBucket} · {p.supplier.country} · {p.supplier.name} · {p.status}
          </li>
        ))}
      </ul>
    </div>
  );
}
