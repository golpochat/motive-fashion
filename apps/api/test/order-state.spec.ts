import { describe, expect, it } from 'vitest';
import { OrderStatus } from '@prisma/client';

const allowed: Record<string, OrderStatus[]> = {
  PENDING_PAYMENT: [OrderStatus.CONFIRMED, OrderStatus.CANCELLED],
  CONFIRMED: [OrderStatus.PACKING, OrderStatus.CANCELLED],
  PACKING: [OrderStatus.SHIPPED, OrderStatus.READY_FOR_COLLECTION],
  SHIPPED: [OrderStatus.DELIVERED],
  READY_FOR_COLLECTION: [OrderStatus.COLLECTED],
};

describe('order state machine', () => {
  it('does not skip packing', () => {
    expect(allowed.CONFIRMED).not.toContain(OrderStatus.DELIVERED);
    expect(allowed.PACKING).toContain(OrderStatus.SHIPPED);
  });
});
