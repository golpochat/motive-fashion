'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/api';

type Level = {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  variant: { sku: string; product: { title: string } };
  location: { code: string };
};

type LocationRow = { id: string; code: string; name: string };

export default function AdminInventory() {
  const [rows, setRows] = useState<Level[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const reload = useCallback(() => {
    fetch(`${API}/admin/inventory`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
    fetch(`${API}/admin/locations`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLocations);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  async function onAdjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget);
    const [variantId, locationId] = String(form.get('level')).split('|');
    const res = await fetch(`${API}/stock/adjust`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        locationId,
        delta: Number(form.get('delta')),
        reason: String(form.get('reason')),
      }),
    });
    if (!res.ok) {
      setError('Adjust failed. Check free stock and reason.');
      return;
    }
    setNotice('On-hand updated.');
    e.currentTarget.reset();
    reload();
  }

  async function onTransfer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/stock/transfer`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: String(form.get('variantId')),
        fromLocationId: String(form.get('fromLocationId')),
        toLocationId: String(form.get('toLocationId')),
        quantity: Number(form.get('quantity')),
      }),
    });
    if (!res.ok) {
      setError('Transfer failed. Locations must differ and free stock must cover the quantity.');
      return;
    }
    setNotice('Stock moved.');
    e.currentTarget.reset();
    reload();
  }

  const variants = Array.from(new Map(rows.map((r) => [r.variantId, r])).values());

  return (
    <div>
      <h1 className="font-serif text-3xl">Inventory</h1>
      <p className="text-sm text-ink/70">available = on hand − reserved</p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <form onSubmit={onAdjust} className="max-w-md space-y-3">
          <h2 className="font-serif text-xl">Adjust on-hand</h2>
          <select name="level" required className="w-full rounded-xl border px-3 py-2">
            <option value="">SKU at location</option>
            {rows.map((r) => (
              <option key={r.id} value={`${r.variantId}|${r.locationId}`}>
                {r.variant.sku} · {r.location.code}
              </option>
            ))}
          </select>
          <input name="delta" type="number" required placeholder="Delta (e.g. -2 or 5)" className="w-full rounded-xl border px-3 py-2" />
          <input name="reason" required minLength={3} placeholder="Reason" className="w-full rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
            Apply
          </button>
        </form>

        <form onSubmit={onTransfer} className="max-w-md space-y-3">
          <h2 className="font-serif text-xl">Transfer</h2>
          <select name="variantId" required className="w-full rounded-xl border px-3 py-2">
            <option value="">SKU</option>
            {variants.map((r) => (
              <option key={r.variantId} value={r.variantId}>
                {r.variant.sku} · {r.variant.product.title}
              </option>
            ))}
          </select>
          <select name="fromLocationId" required className="w-full rounded-xl border px-3 py-2">
            <option value="">From</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
          <select name="toLocationId" required className="w-full rounded-xl border px-3 py-2">
            <option value="">To</option>
            {locations.map((l) => (
              <option key={`to-${l.id}`} value={l.id}>
                {l.code}
              </option>
            ))}
          </select>
          <input name="quantity" type="number" min={1} required defaultValue={1} className="w-full rounded-xl border px-3 py-2" />
          <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
            Move stock
          </button>
        </form>
      </div>

      <table className="mt-8 w-full text-left text-sm">
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
