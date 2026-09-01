'use client';

import { FormEvent, useState } from 'react';
import { API, type ProductCard } from '@/lib/api';

export default function AdminPos() {
  const [preview, setPreview] = useState('');

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const sku = String(form.get('sku'));
    const qty = Number(form.get('qty') || 1);
    const catalog = (await fetch(`${API}/catalog/products?sku=${encodeURIComponent(sku)}`, {
      credentials: 'include',
    }).then((r) => r.json())) as ProductCard[];
    const variant = catalog.flatMap((p) => p.variants).find((v) => v.sku === sku);
    if (!variant) {
      setPreview('Unknown SKU');
      return;
    }
    const unitPriceCents = variant.priceCents;
    const sale = await fetch(`${API}/channels/pos/sales`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        externalId: `pwa-${Date.now()}`,
        name: String(form.get('name') || 'Walk-in'),
        lines: [{ sku, quantity: qty, unitPriceCents }],
        totalCents: unitPriceCents * qty,
      }),
    }).then((r) => r.json());
    if (sale.orderId) {
      const printed = await fetch(`${API}/admin/pos/print/${sale.orderId}`, {
        method: 'POST',
        credentials: 'include',
      }).then((r) => r.json());
      setPreview(printed.preview ?? JSON.stringify(sale));
    } else {
      setPreview(JSON.stringify(sale));
    }
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Tablet POS</h1>
      <p className="text-sm">Uses the same StockService as the website.</p>
      <form onSubmit={onSubmit} className="mt-6 max-w-md space-y-3">
        <input name="sku" required placeholder="SKU" className="w-full rounded-xl border px-3 py-2" />
        <input name="qty" type="number" defaultValue={1} className="w-full rounded-xl border px-3 py-2" />
        <input name="name" placeholder="Customer name" className="w-full rounded-xl border px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
          Take sale
        </button>
      </form>
      {preview ? <pre className="mt-6 whitespace-pre-wrap rounded-xl bg-ink/5 p-4 text-sm">{preview}</pre> : null}
    </div>
  );
}
