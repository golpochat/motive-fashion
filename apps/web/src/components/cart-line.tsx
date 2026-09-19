'use client';

import { formatEur } from '@motive-fashion/utils';
import type { CartLine } from '@/lib/cart-store';
import { StorefrontImage } from '@/components/storefront-image';

export function CartLineRow({
  item,
  compact,
  onQty,
  onRemove,
  onRecover,
}: {
  item: CartLine;
  compact?: boolean;
  onQty: (id: string, quantity: number) => void;
  onRemove: (id: string) => void;
  onRecover?: (item: CartLine) => void;
}) {
  const thumb = item.imageUrl
    ? {
        url: item.imageUrl,
        alt: item.imageAlt || item.title,
      }
    : null;
  const soldOut = item.available != null && item.available < 1;
  const holdGone = item.reserved === false;
  const overSold = item.available != null && item.available > 0 && item.quantity > item.available;

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
          {soldOut ? (
            <p className="mt-2 text-xs text-red-700">This size and colour is gone. Remove it or pick another on the product page.</p>
          ) : holdGone ? (
            <p className="mt-2 text-xs text-ink/70">The hold expired. Reserve again to keep it in your bag.</p>
          ) : overSold ? (
            <p className="mt-2 text-xs text-ink/70">Only {item.available} left. Reduce the quantity to continue.</p>
          ) : null}
          <div className="mt-3 flex items-center justify-between gap-3">
            {soldOut ? (
              <button
                type="button"
                className="min-h-11 text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline"
                onClick={() => onRemove(item.id)}
              >
                Remove
              </button>
            ) : (
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
                  disabled={item.available != null && item.quantity >= item.available}
                  onClick={() => onQty(item.id, item.quantity + 1)}
                >
                  +
                </button>
              </div>
            )}
            <div className="flex items-center gap-3">
              {holdGone && !soldOut && onRecover ? (
                <button
                  type="button"
                  className="min-h-11 text-sm text-accent underline-offset-4 hover:underline"
                  onClick={() => onRecover(item)}
                >
                  Reserve again
                </button>
              ) : null}
              {!soldOut ? (
                <button
                  type="button"
                  className="min-h-11 text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline"
                  onClick={() => onRemove(item.id)}
                >
                  Remove
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}
