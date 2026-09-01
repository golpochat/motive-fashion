import { describe, expect, it } from 'vitest';
import { availableStock, promoDiscountCents, splitVatInclusive } from '@motive-fashion/utils';
import { StockService } from '../src/modules/inventory/stock.service';

describe('availableStock', () => {
  it('never goes negative', () => {
    expect(availableStock(3, 5)).toBe(0);
    expect(availableStock(10, 2)).toBe(8);
  });
});

describe('VAT split', () => {
  it('splits 23% inclusive prices', () => {
    const { netCents, taxCents, grossCents } = splitVatInclusive(1230, 0.23);
    expect(grossCents).toBe(1230);
    expect(netCents + taxCents).toBe(1230);
  });
});

describe('promoDiscountCents', () => {
  it('treats PERCENT value as basis points (1000 = 10%)', () => {
    expect(promoDiscountCents(10000, 'PERCENT', 1000)).toBe(1000);
    expect(promoDiscountCents(10000, 'FIXED', 500)).toBe(500);
    expect(promoDiscountCents(400, 'FIXED', 500)).toBe(400);
  });
});

describe('StockService.available', () => {
  it('delegates to shared helper', () => {
    const svc = Object.create(StockService.prototype) as StockService;
    expect(svc.available(4, 1)).toBe(3);
  });
});
