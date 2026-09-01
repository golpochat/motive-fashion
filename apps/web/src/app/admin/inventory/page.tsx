'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminInventory() {
  const [rows, setRows] = useState<
    { id: string; onHand: number; reserved: number; variant: { sku: string; product: { title: string } }; location: { code: string } }[]
  >([]);
  useEffect(() => {
    fetch(`${API}/admin/inventory`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Inventory</h1>
      <p className="text-sm text-ink/70">available = on hand − reserved</p>
      <table className="mt-4 w-full text-left text-sm">
        <thead>
          <tr>
            <th>SKU</th>
            <th>Location</th>
            <th>On hand</th>
            <th>Reserved</th>
            <th>Free</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="py-2">
                {r.variant.sku}
                <div className="text-ink/60">{r.variant.product.title}</div>
              </td>
              <td>{r.location.code}</td>
              <td>{r.onHand}</td>
              <td>{r.reserved}</td>
              <td>{Math.max(0, r.onHand - r.reserved)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
