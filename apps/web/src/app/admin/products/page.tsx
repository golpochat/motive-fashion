'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminProducts() {
  const [rows, setRows] = useState<{ id: string; title: string; slug: string; variants: unknown[] }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/products`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Products</h1>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            <th>Title</th>
            <th>Slug</th>
            <th>SKUs</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">{r.title}</td>
              <td>{r.slug}</td>
              <td>{r.variants.length}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
