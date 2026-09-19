import { BadRequestException } from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma';

export function paidCreatedAt(from?: string, to?: string): Prisma.OrderWhereInput {
  const range: Prisma.DateTimeFilter = {};
  if (from) {
    const start = new Date(from);
    if (Number.isNaN(start.getTime())) throw new BadRequestException('from must be a date');
    range.gte = start;
  }
  if (to) {
    const end = new Date(to);
    if (Number.isNaN(end.getTime())) throw new BadRequestException('to must be a date');
    end.setHours(23, 59, 59, 999);
    range.lte = end;
  }
  return {
    status: { notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED] },
    ...(Object.keys(range).length ? { createdAt: range } : {}),
  };
}

export function isoDublinDay(date: Date) {
  return date.toLocaleDateString('en-CA', { timeZone: 'Europe/Dublin' });
}

/** Inclusive YYYY-MM-DD range in Europe/Dublin, filled with zero days. */
export function fillDailySeries(
  fromIso: string,
  toIso: string,
  rows: { createdAt: Date; totalCents: number }[],
) {
  const start = Date.parse(`${fromIso}T12:00:00.000Z`);
  const end = Date.parse(`${toIso}T12:00:00.000Z`);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return [];
  const buckets = new Map<string, { date: string; revenueCents: number; orders: number }>();
  for (let t = start; t <= end; t += 86_400_000) {
    const date = isoDublinDay(new Date(t));
    buckets.set(date, { date, revenueCents: 0, orders: 0 });
  }
  for (const row of rows) {
    const date = isoDublinDay(row.createdAt);
    const bucket = buckets.get(date);
    if (!bucket) continue;
    bucket.revenueCents += row.totalCents;
    bucket.orders += 1;
  }
  return [...buckets.values()];
}

export function seriesRange(from?: string, to?: string) {
  const today = isoDublinDay(new Date());
  const start = from || isoDublinDay(new Date(Date.now() - 29 * 86_400_000));
  const end = to || today;
  return { from: start, to: end };
}
