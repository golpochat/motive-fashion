import { describe, expect, it } from 'vitest';
import {
  addPoLineUnits,
  lineOpenQty,
  mergePoLines,
  monthBucketNow,
  sellPace,
  suggestedBuyQty,
} from '../src/modules/procurement/procurement-board';

describe('supplier board helpers', () => {
  it('splits open qty from received qty', () => {
    expect(lineOpenQty(300, 0)).toBe(300);
    expect(lineOpenQty(300, 40)).toBe(260);
    expect(lineOpenQty(20, 20)).toBe(0);
  });

  it('buckets draft vs ordered vs in-transit vs received', () => {
    const acc = { draft: 0, ordered: 0, inTransit: 0, received: 0 };
    addPoLineUnits(acc, 'DRAFT', 300, 0);
    addPoLineUnits(acc, 'ORDERED', 40, 0);
    addPoLineUnits(acc, 'IN_TRANSIT', 100, 20);
    expect(acc).toEqual({ draft: 300, ordered: 40, inTransit: 80, received: 20 });
  });

  it('flags fast vs quiet sell-through', () => {
    expect(sellPace(0, 0)).toBe('quiet');
    expect(sellPace(10, 8)).toBe('fast');
    expect(sellPace(4, 2)).toBe('fast');
    expect(sellPace(2, 2)).toBe('steady');
  });

  it('buckets the current month as YYYY-MM', () => {
    expect(monthBucketNow(new Date(2026, 8, 13))).toBe('2026-09');
  });

  it('merges duplicate SKU lines', () => {
    expect(
      mergePoLines([
        { variantId: 'a', quantity: 10 },
        { variantId: 'b', quantity: 4 },
        { variantId: 'a', quantity: 5 },
      ]),
    ).toEqual([
      { variantId: 'a', quantity: 15 },
      { variantId: 'b', quantity: 4 },
    ]);
  });

  it('suggests a factory buy when cover is below reorder', () => {
    expect(suggestedBuyQty(10, 0, 20)).toBe(30);
    expect(suggestedBuyQty(2, 0, 8)).toBe(14);
    expect(suggestedBuyQty(40, 10, 20)).toBe(0);
  });
});

describe('receive shipment body', () => {
  it('allows omitting lines to receive remaining units', async () => {
    const { receiveShipmentSchema } = await import('@motive-fashion/validation');
    expect(receiveShipmentSchema.parse({})).toEqual({});
  });

  it('rejects an empty lines array', async () => {
    const { receiveShipmentSchema } = await import('@motive-fashion/validation');
    expect(() => receiveShipmentSchema.parse({ lines: [] })).toThrow();
  });
});
