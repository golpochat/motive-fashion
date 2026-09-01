import { availableStock } from '@motive-fashion/utils';

export type MutableLevel = { onHand: number; reserved: number };

export function canReserve(onHand: number, reserved: number, quantity: number) {
  return quantity >= 1 && availableStock(onHand, reserved) >= quantity;
}

/** Same predicate as `UPDATE ... WHERE ("onHand" - reserved) >= quantity`. */
export function compareAndReserve(level: MutableLevel, quantity: number) {
  if (!canReserve(level.onHand, level.reserved, quantity)) return false;
  level.reserved += quantity;
  return true;
}

export async function withLock<T>(tail: { current: Promise<void> }, fn: () => T | Promise<T>) {
  const prev = tail.current;
  let release: () => void = () => undefined;
  tail.current = new Promise<void>((resolve) => {
    release = resolve;
  });
  await prev;
  try {
    return await fn();
  } finally {
    release();
  }
}
