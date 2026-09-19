import { describe, expect, it } from 'vitest';
import { fillDailySeries, isoDublinDay, seriesRange } from '../src/modules/admin/analytics-where';

describe('analytics daily series', () => {
  it('fills empty Dublin days and buckets paid totals', () => {
    const rows = [
      { createdAt: new Date('2026-09-01T10:00:00.000Z'), totalCents: 7500 },
      { createdAt: new Date('2026-09-01T18:00:00.000Z'), totalCents: 1800 },
      { createdAt: new Date('2026-09-03T12:00:00.000Z'), totalCents: 9000 },
    ];
    const series = fillDailySeries('2026-09-01', '2026-09-03', rows);
    expect(series.map((row) => row.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(series[0]).toEqual({ date: '2026-09-01', revenueCents: 9300, orders: 2 });
    expect(series[1]).toEqual({ date: '2026-09-02', revenueCents: 0, orders: 0 });
    expect(series[2]).toEqual({ date: '2026-09-03', revenueCents: 9000, orders: 1 });
  });

  it('defaults an open range to the last 30 Dublin days', () => {
    const range = seriesRange();
    expect(range.from <= range.to).toBe(true);
    expect(range.to).toBe(isoDublinDay(new Date()));
  });
});
