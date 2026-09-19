import { describe, expect, it } from 'vitest';
import { accountPatchSchema, orderLookupSchema } from '@motive-fashion/validation';
import { paidCreatedAt } from '../src/modules/admin/analytics-where';
import { OrderStatus } from '../generated/prisma';

describe('accountPatchSchema', () => {
  it('accepts name, phone, and opt-ins', () => {
    expect(
      accountPatchSchema.parse({
        name: 'Amina',
        phone: '+353 1 555 0100',
        marketingOptIn: true,
        whatsappOptIn: false,
      }),
    ).toMatchObject({ name: 'Amina', marketingOptIn: true, whatsappOptIn: false });
  });

  it('rejects empty names and unknown fields', () => {
    expect(() => accountPatchSchema.parse({ name: '' })).toThrow();
    expect(() => accountPatchSchema.parse({ email: 'x@y.z' })).toThrow();
  });
});

describe('orderLookupSchema', () => {
  it('needs an email and a ticket', () => {
    expect(orderLookupSchema.parse({ email: 'guest@example.com', ticket: 'MF-1234' })).toEqual({
      email: 'guest@example.com',
      ticket: 'MF-1234',
    });
    expect(() => orderLookupSchema.parse({ email: 'nope', ticket: 'MF-1234' })).toThrow();
  });
});

describe('analytics date filter', () => {
  it('defaults to all-time paid orders', () => {
    expect(paidCreatedAt()).toEqual({
      status: { notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED] },
    });
  });

  it('scopes createdAt when from and to are set', () => {
    const where = paidCreatedAt('2026-01-01', '2026-01-31');
    expect(where.createdAt).toMatchObject({
      gte: new Date('2026-01-01'),
    });
    expect(where.createdAt && 'lte' in where.createdAt).toBe(true);
  });
});


describe('accountPatchSchema', () => {
  it('accepts name, phone, and opt-ins', () => {
    expect(
      accountPatchSchema.parse({
        name: 'Amina',
        phone: '+353 1 555 0100',
        marketingOptIn: true,
        whatsappOptIn: false,
      }),
    ).toMatchObject({ name: 'Amina', marketingOptIn: true, whatsappOptIn: false });
  });

  it('rejects empty names and unknown fields', () => {
    expect(() => accountPatchSchema.parse({ name: '' })).toThrow();
    expect(() => accountPatchSchema.parse({ email: 'x@y.z' })).toThrow();
  });
});

describe('orderLookupSchema', () => {
  it('needs an email and a ticket', () => {
    expect(orderLookupSchema.parse({ email: 'guest@example.com', ticket: 'MF-1234' })).toEqual({
      email: 'guest@example.com',
      ticket: 'MF-1234',
    });
    expect(() => orderLookupSchema.parse({ email: 'nope', ticket: 'MF-1234' })).toThrow();
  });
});
