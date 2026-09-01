import { describe, expect, it } from 'vitest';
import { availableStock } from '@motive-fashion/utils';
import { compareAndReserve, withLock, type MutableLevel } from '../src/modules/inventory/stock-atomic';

async function naiveReserve(level: MutableLevel, quantity: number) {
  const free = availableStock(level.onHand, level.reserved);
  await Promise.resolve();
  if (free < quantity) return false;
  level.reserved += quantity;
  return true;
}

describe('stock reservation races', () => {
  it('read-check-write oversells the last unit', async () => {
    const level: MutableLevel = { onHand: 1, reserved: 0 };
    const results = await Promise.all([naiveReserve(level, 1), naiveReserve(level, 1)]);
    expect(results.filter(Boolean)).toHaveLength(2);
    expect(level.reserved).toBeGreaterThan(level.onHand);
  });

  it('compare-and-set does not oversell under concurrency', async () => {
    const level: MutableLevel = { onHand: 8, reserved: 0 };
    const lock = { current: Promise.resolve() };
    const results = await Promise.all(
      Array.from({ length: 40 }, () =>
        withLock(lock, () => compareAndReserve(level, 1)),
      ),
    );
    expect(results.filter(Boolean)).toHaveLength(8);
    expect(level.reserved).toBe(8);
    expect(availableStock(level.onHand, level.reserved)).toBe(0);
  });

  it('rejects a reserve that would exceed free stock', () => {
    const level: MutableLevel = { onHand: 2, reserved: 2 };
    expect(compareAndReserve(level, 1)).toBe(false);
    expect(level.reserved).toBe(2);
  });
});
