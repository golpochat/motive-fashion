export function formatEur(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function splitVatInclusive(grossCents: number, rate = 0.23) {
  const netCents = Math.round(grossCents / (1 + rate));
  const taxCents = grossCents - netCents;
  return { netCents, taxCents, grossCents };
}

export function availableStock(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
}

/** PERCENT `value` is basis points (1000 = 10%, 10000 = 100%). FIXED is EUR cents. */
export function promoDiscountCents(
  subtotalCents: number,
  type: 'PERCENT' | 'FIXED',
  value: number,
) {
  if (subtotalCents < 1 || value < 1) return 0;
  if (type === 'PERCENT') {
    return Math.min(subtotalCents, Math.round(subtotalCents * (value / 10000)));
  }
  return Math.min(subtotalCents, value);
}

/** Outbound delivery quote. Collection uses the method fee; free-over applies to delivery only. */
export function quoteShippingCents(input: {
  fulfillment: 'DELIVERY' | 'COLLECTION';
  goodsCents: number;
  collectionFeeCents: number;
  countyRateCents: number;
  freeOverCents: number | null;
}): number {
  if (input.fulfillment === 'COLLECTION') return Math.max(0, input.collectionFeeCents);
  if (input.freeOverCents != null && input.goodsCents >= input.freeOverCents) return 0;
  return Math.max(0, input.countyRateCents);
}
