'use client';

import { formatEur } from '@motive-fashion/utils';
import type { CartLine } from '@/lib/cart-store';
import { StorefrontImage } from '@/components/storefront-image';

export function CartLineRow({
  item,
  compact,
  onQty,
  onRemove,
}: {
  item: CartLine;
  compact?: boolean;
  onQty: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
}) {
  const thumb = item.imageUrl
    ? {
        url: item.imageUrl,
        alt: item.imageAlt || item.title,
      }
    : null;

  return (
    <li className={compact ? 'py-3' : 'py-5'}>
      <div className="flex items-start gap-3">
        {thumb ? (
          <div
            className={`relative shrink-0 overflow-hidden rounded-lg bg-ink/5 ${compact ? 'h-16 w-14' : 'h-20 w-[4.5rem]'}`}
          >
            <StorefrontImage src={thumb.url} alt={thumb.alt} sizes="72px" />
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className={compact ? 'truncate text-sm font-medium' : 'font-medium'}>{item.title}</p>
              <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-ink/70`}>
                {item.size} / {item.color}
                <span className="text-ink/55"> · {formatEur(item.unitPriceCents)} each</span>
              </p>
            </div>
            <p className={`shrink-0 tabular-nums ${compact ? 'text-sm' : ''}`}>
              {formatEur(item.unitPriceCents * item.quantity)}
            </p>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex items-center rounded-lg border border-ink/15">
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center text-sm"
                aria-label="Decrease quantity"
                onClick={() => onQty(item.id, item.quantity - 1)}
              >
                −
              </button>
              <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{item.quantity}</span>
              <button
                type="button"
                className="flex h-11 w-11 items-center justify-center text-sm"
                aria-label="Increase quantity"
                onClick={() => onQty(item.id, item.quantity + 1)}
              >
                +
              </button>
            </div>
            <button
              type="button"
              className="min-h-11 text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline"
              onClick={() => onRemove(item.id)}
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
