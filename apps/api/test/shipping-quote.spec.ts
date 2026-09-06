import { describe, expect, it } from 'vitest';
import { quoteShippingCents } from '@motive-fashion/utils';

describe('quoteShippingCents', () => {
  it('uses collection fee and ignores county / free-over', () => {
    expect(
      quoteShippingCents({
        fulfillment: 'COLLECTION',
        goodsCents: 20000,
        collectionFeeCents: 0,
        countyRateCents: 595,
        freeOverCents: 12000,
      }),
    ).toBe(0);
  });

  it('waives delivery at the free-over threshold', () => {
    expect(
      quoteShippingCents({
        fulfillment: 'DELIVERY',
        goodsCents: 12000,
        collectionFeeCents: 0,
        countyRateCents: 595,
        freeOverCents: 12000,
      }),
    ).toBe(0);
  });

  it('locks the county rate below the threshold', () => {
    expect(
      quoteShippingCents({
        fulfillment: 'DELIVERY',
        goodsCents: 11999,
        collectionFeeCents: 0,
        countyRateCents: 795,
        freeOverCents: 12000,
      }),
    ).toBe(795);
  });
});
