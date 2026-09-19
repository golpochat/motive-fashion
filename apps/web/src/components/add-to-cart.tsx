'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { addCartItem } from '@/lib/cart-store';
import { canShop } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';
import { BRAND, priceTaxSuffix } from '@motive-fashion/config';
import { catalogSizeLabel, formatEur, sizeHintForCategory, uniqueColors, uniqueSizes } from '@motive-fashion/utils';
import { variantPriceRange } from '@/lib/catalog';
import { ChoiceChip } from '@/components/dashboard-ui';

type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  fabric?: string | null;
  priceCents: number;
  available: number;
};

export function AddToCart({
  variants,
  categorySlug,
  children,
}: {
  variants: Variant[];
  categorySlug?: string;
  children?: React.ReactNode;
}) {
  const { me } = useSession();
  const inStock = variants.filter((row) => row.available > 0);
  const initial = inStock[0] ?? variants[0];
  const [size, setSize] = useState(initial?.size ?? '');
  const [color, setColor] = useState(initial?.color ?? '');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  const sizes = uniqueSizes(variants);
  const colorsForSize = uniqueColors(variants.filter((row) => row.size === size));
  const selected =
    variants.find((row) => row.size === size && row.color === color) ??
    variants.find((row) => row.size === size && row.available > 0) ??
    initial;
  const range = variantPriceRange(variants);
  const soldOut = !selected || selected.available < 1;

  const sizeOptions = useMemo(
    () =>
      sizes.map((item) => ({
        value: item,
        available: variants.some((row) => row.size === item && row.available > 0),
      })),
    [sizes, variants],
  );

  function pickSize(next: string) {
    setSize(next);
    const nextColors = variants.filter((row) => row.size === next);
    const keep = nextColors.find((row) => row.color === color && row.available > 0);
    const fallback = nextColors.find((row) => row.available > 0) ?? nextColors[0];
    setColor(keep?.color ?? fallback?.color ?? '');
  }

  async function add() {
    if (!selected || soldOut) return;
    setBusy(true);
    setMsg('');
    try {
      await addCartItem(selected.id, 1);
      setMsg(`Reserved in your cart for ${BRAND.reservationMinutes} minutes.`);
    } catch {
      setMsg('Could not add that piece. Try another size or colour.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="mt-4 text-xl">{formatEur(selected?.priceCents ?? 0)}{priceTaxSuffix()}</p>
      {range.mixed ? <p className="mt-1 text-sm text-ink/55">Price depends on size.</p> : null}
      {children}
      <div className="mt-6 space-y-4">
        {sizeOptions.length > 1 ? (
          <fieldset>
            <legend className="text-sm">Size</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Size">
              {sizeOptions.map((item) => (
                <ChoiceChip
                  key={item.value}
                  selected={size === item.value}
                  disabled={!item.available}
                  onClick={() => pickSize(item.value)}
                >
                  {catalogSizeLabel(item.value)}
                  {!item.available ? ' · sold out' : ''}
                </ChoiceChip>
              ))}
            </div>
          </fieldset>
        ) : null}
        {colorsForSize.length ? (
          <fieldset>
            <legend className="text-sm">{sizeOptions.length > 1 ? 'Colour' : 'Colour / size'}</legend>
            <div className="mt-2 flex flex-wrap gap-2" role="group" aria-label="Colour">
              {colorsForSize.map((item) => {
                const row = variants.find((variant) => variant.size === size && variant.color === item);
                const available = (row?.available ?? 0) > 0;
                return (
                  <ChoiceChip
                    key={item}
                    selected={color === item}
                    disabled={!available}
                    onClick={() => setColor(item)}
                  >
                    {item}
                    {!available ? ' · sold out' : ''}
                  </ChoiceChip>
                );
              })}
            </div>
          </fieldset>
        ) : null}
        <p className="text-sm text-ink/55">
          {soldOut
            ? 'This combination is sold out.'
            : `${selected?.available ?? 0} in Dublin · SKU ${selected?.sku ?? '—'}`}
        </p>
        <p className="text-sm text-ink/70">
          {sizeHintForCategory(categorySlug, BRAND.returnDays)}{' '}
          <Link href="/size-guide">Full size guide</Link>
        </p>
        {me && !canShop(me) ? (
          <p className="text-sm text-ink/70">Only a customer account can add to cart. Take a sale on the till, or sign out to shop as a guest.</p>
        ) : (
          <button
            type="button"
            onClick={() => void add()}
            disabled={busy || soldOut}
            className="rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50"
          >
            {busy ? 'Adding…' : soldOut ? 'Sold out' : 'Add to cart'}
          </button>
        )}
        {msg ? <p className="text-sm text-ink/70">{msg}</p> : null}
      </div>
    </>
  );
}
