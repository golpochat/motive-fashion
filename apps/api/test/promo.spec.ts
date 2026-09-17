import { describe, expect, it } from 'vitest';
import { formatEur, promoOfferLabel, promoRejectReason, promoStatus } from '@motive-fashion/utils';
import { promoCreateSchema } from '@motive-fashion/validation';

const now = new Date('2026-09-16T12:00:00.000Z');

describe('promoStatus', () => {
  it('labels live, scheduled, expired, exhausted, and off', () => {
    expect(promoStatus({ active: true, usedCount: 0 }, now)).toBe('live');
    expect(promoStatus({ active: true, startsAt: '2026-09-20T00:00:00.000Z', usedCount: 0 }, now)).toBe('scheduled');
    expect(promoStatus({ active: true, endsAt: '2026-09-01T00:00:00.000Z', usedCount: 0 }, now)).toBe('expired');
    expect(promoStatus({ active: true, maxUses: 5, usedCount: 5 }, now)).toBe('exhausted');
    expect(promoStatus({ active: false, usedCount: 0 }, now)).toBe('inactive');
  });
});

describe('promoRejectReason', () => {
  it('explains why checkout cannot apply the code', () => {
    expect(promoRejectReason({ active: true, usedCount: 0 }, now)).toBeNull();
    expect(promoRejectReason({ active: false, usedCount: 0 }, now)).toMatch(/switched off/);
    expect(promoRejectReason({ active: true, startsAt: '2026-10-01T00:00:00.000Z', usedCount: 0 }, now)).toMatch(/not valid yet/);
    expect(promoRejectReason({ active: true, endsAt: '2026-01-01T00:00:00.000Z', usedCount: 0 }, now)).toMatch(/expired/);
    expect(promoRejectReason({ active: true, maxUses: 1, usedCount: 1 }, now)).toMatch(/no uses left/);
  });
});

describe('promoOfferLabel', () => {
  it('renders percent from basis points and fixed from cents', () => {
    expect(promoOfferLabel('PERCENT', 1000)).toBe('10% off');
    expect(promoOfferLabel('FIXED', 1500)).toBe(`${formatEur(1500)} off`);
  });
});

describe('promoCreateSchema', () => {
  it('rejects percent over 100% and an end before the start', () => {
    expect(() =>
      promoCreateSchema.parse({
        code: 'TOO-BIG',
        type: 'PERCENT',
        value: 10001,
      }),
    ).toThrow();
    expect(() =>
      promoCreateSchema.parse({
        code: 'WINDOW',
        type: 'FIXED',
        value: 500,
        startsAt: '2026-09-20T00:00:00.000Z',
        endsAt: '2026-09-10T00:00:00.000Z',
      }),
    ).toThrow();
    expect(
      promoCreateSchema.parse({
        code: 'eid10',
        type: 'PERCENT',
        value: 1000,
        startsAt: '2026-09-10T00:00:00.000Z',
        endsAt: '2026-09-20T00:00:00.000Z',
      }).code,
    ).toBe('eid10');
  });
});
