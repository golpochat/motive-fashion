'use client';

import { useState } from 'react';
import { API } from '@/lib/api';

type Variant = { id: string; size: string; color: string; available: number };

export function AddToCart({ variants }: { variants: Variant[] }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [msg, setMsg] = useState('');

  async function add() {
    const cartId = localStorage.getItem('mf_cart');
    const created = cartId
      ? { id: cartId }
      : await fetch(`${API}/cart`, { method: 'POST', credentials: 'include' }).then((r) => r.json());
    localStorage.setItem('mf_cart', created.id);
    await fetch(`${API}/cart/${created.id}/items`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, quantity: 1 }),
    });
    setMsg('Reserved in your cart for 15 minutes.');
  }

  return (
    <div className="mt-6 space-y-3">
      <label className="block text-sm">
        Size / colour
        <select
          className="mt-1 w-full rounded-xl border border-ink/15 bg-white px-3 py-2"
          value={variantId}
          onChange={(e) => setVariantId(e.target.value)}
        >
          {variants.map((v) => (
            <option key={v.id} value={v.id} disabled={v.available < 1}>
              {v.size} / {v.color} {v.available < 1 ? '(sold out)' : ''}
            </option>
          ))}
        </select>
      </label>
      <button type="button" onClick={add} className="rounded-full bg-ink px-6 py-3 text-cream">
        Add to cart
      </button>
      {msg ? <p className="text-sm text-moss">{msg}</p> : null}
    </div>
  );
}
