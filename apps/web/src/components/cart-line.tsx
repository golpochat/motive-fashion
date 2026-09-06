'use client';

import { formatEur } from '@motive-fashion/utils';
import type { CartLine } from '@/lib/cart-store';

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
  return (
    <li className={compact ? 'py-4' : 'py-5'}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={compact ? 'truncate text-sm font-medium' : 'font-medium'}>{item.title}</p>
          <p className={`mt-1 ${compact ? 'text-xs' : 'text-sm'} text-ink/60`}>
            {item.size} / {item.color}
            <span className="text-ink/45"> · {formatEur(item.unitPriceCents)} each</span>
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
            className="px-3 py-1 text-sm"
            aria-label="Decrease quantity"
            onClick={() => onQty(item.id, item.quantity - 1)}
          >
            −
          </button>
          <span className="min-w-[1.5rem] text-center text-sm tabular-nums">{item.quantity}</span>
          <button
            type="button"
            className="px-3 py-1 text-sm"
            aria-label="Increase quantity"
            onClick={() => onQty(item.id, item.quantity + 1)}
          >
            +
          </button>
        </div>
        <button
          type="button"
          className="text-sm text-ink/70 underline-offset-4 hover:text-ink hover:underline"
          onClick={() => onRemove(item.id)}
        >
          Remove
        </button>
      </div>
    </li>
  );
}
