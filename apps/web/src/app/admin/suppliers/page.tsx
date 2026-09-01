'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminSuppliers() {
  const [rows, setRows] = useState<{ id: string; name: string; country: string; example: boolean }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/procurement/suppliers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Suppliers</h1>
      <p className="text-sm text-ink/70">Seed contacts are examples until verified.</p>
      <ul className="mt-4 text-sm">
        {rows.map((s) => (
          <li key={s.id} className="border-b py-2">
            {s.country} — {s.name} {s.example ? '(example)' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}
