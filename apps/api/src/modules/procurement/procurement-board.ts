export type SellPace = 'fast' | 'steady' | 'quiet';

export function lineOpenQty(quantity: number, receivedQty: number) {
  return Math.max(0, quantity - receivedQty);
}

export function addPoLineUnits(
  acc: { draft: number; ordered: number; inTransit: number; received: number },
  status: string,
  quantity: number,
  receivedQty: number,
) {
  const open = lineOpenQty(quantity, receivedQty);
  if (status === 'DRAFT') acc.draft += open;
  else if (status === 'ORDERED') acc.ordered += open;
  else if (status === 'IN_TRANSIT' || status === 'PARTIALLY_RECEIVED') acc.inTransit += open;
  acc.received += receivedQty;
  return acc;
}

/** Last 30 days vs the 30 days before that. Fast = at least 3 units and up 25% or already 8+ and not slowing. */
export function sellPace(sold30d: number, soldPrev30d: number): SellPace {
  if (sold30d <= 0) return 'quiet';
  if (sold30d >= 8 && sold30d >= soldPrev30d) return 'fast';
  if (sold30d >= 3 && sold30d >= Math.max(1, soldPrev30d) * 1.25) return 'fast';
  return 'steady';
}

export function monthBucketNow(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function mergePoLines<T extends { variantId: string; quantity: number }>(lines: T[]) {
  const merged = new Map<string, T>();
  for (const line of lines) {
    const existing = merged.get(line.variantId);
    if (!existing) {
      merged.set(line.variantId, { ...line });
      continue;
    }
    existing.quantity += line.quantity;
  }
  return [...merged.values()];
}

/** Below reorder: buy enough to reach 2× reorder. */
export function suggestedBuyQty(onHand: number, inbound: number, reorderPoint: number) {
  const cover = onHand + inbound;
  if (cover >= reorderPoint) return 0;
  return Math.max(1, reorderPoint * 2 - cover);
}
