'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminCustomers() {
  const [rows, setRows] = useState<{ id: string; email: string; name: string }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/customers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Customers</h1>
      <ul className="mt-4 text-sm">
        {rows.map((c) => (
          <li key={c.id} className="border-b py-2">
            {c.name} — {c.email}
          </li>
        ))}
      </ul>
    </div>
  );
}
