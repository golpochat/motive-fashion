'use client';

import { FormEvent, useState } from 'react';
import { API, type ProductCard } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Field, Panel, PrimaryButton, fieldClass } from '@/components/dashboard-ui';

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
      <PageHeader title="POS" description="Walk-in sales are recorded as cash on the till. The website never offers cash." />
      <div className="max-w-lg">
        <Panel title="Take sale">
          <form onSubmit={onSubmit} className="space-y-3">
            <Field label="SKU">
              <input name="sku" required className={fieldClass} />
            </Field>
            <Field label="Quantity">
              <input name="qty" type="number" defaultValue={1} className={fieldClass} />
            </Field>
            <Field label="Customer name">
              <input name="name" className={fieldClass} />
            </Field>
            <PrimaryButton type="submit">Take sale</PrimaryButton>
          </form>
        </Panel>
      </div>
      {preview ? <pre className="mt-4 overflow-x-auto whitespace-pre-wrap rounded-2xl border border-ink/10 bg-white p-4 text-sm">{preview}</pre> : null}
    </div>
  );
}
