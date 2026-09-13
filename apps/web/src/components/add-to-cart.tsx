'use client';

import { useState } from 'react';
import { addCartItem } from '@/lib/cart-store';
import { Select } from '@/components/select';
import { BRAND } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { variantPriceRange } from '@/lib/catalog';

type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  fabric?: string | null;
  priceCents: number;
  available: number;
};

export function AddToCart({ variants, children }: { variants: Variant[]; children?: React.ReactNode }) {
  const [variantId, setVariantId] = useState(variants[0]?.id ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);
  const selected = variants.find((variant) => variant.id === variantId) ?? variants[0];
  const range = variantPriceRange(variants);

  async function add() {
    setBusy(true);
    setMsg('');
    try {
      await addCartItem(variantId, 1);
      setMsg(`Reserved in your cart for ${BRAND.reservationMinutes} minutes.`);
    } catch {
      setMsg('Could not add that piece. Try another size.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-4 text-xl">{formatEur(selected?.priceCents ?? 0)} inc. VAT</p>
      {range.mixed ? <p className="mt-1 text-sm text-ink/55">Price depends on size.</p> : null}
      {children}
      <div className="mt-6 space-y-3">
        <label className="block text-sm">
          Size / colour
          <Select
            className="mt-1 w-full min-h-11 rounded-xl border border-ink/15 bg-white px-3 py-2"
            value={variantId}
            onChange={setVariantId}
            options={variants.map((v) => ({
              value: v.id,
              label: range.mixed
                ? `${v.size} / ${v.color} · ${formatEur(v.priceCents)}${v.available < 1 ? ' (sold out)' : ''}`
                : `${v.size} / ${v.color}${v.available < 1 ? ' (sold out)' : ''}`,
              disabled: v.available < 1,
            }))}
          />
        </label>
        <p className="text-sm text-ink/55">SKU {selected?.sku ?? '—'}</p>
        <button type="button" onClick={() => void add()} disabled={busy} className="rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50">
          {busy ? 'Adding…' : 'Add to cart'}
        </button>
        {msg ? <p className="text-sm text-ink/70">{msg}</p> : null}
      </div>
    </>
  );
}
