import { describe, expect, it } from 'vitest';
import { FulfillmentMethod, OrderStatus, PaymentStatus } from '@prisma/client';
import {
  isCashPayment,
  paymentStatusAfterRefund,
  refundableCents,
  refundProviderLabel,
  shouldRestockOnRefund,
} from '../src/modules/orders/refund-policy';

describe('refund policy', () => {
  it('caps remaining amount', () => {
    expect(refundableCents(18900, 0)).toBe(18900);
    expect(refundableCents(18900, 5000)).toBe(13900);
    expect(refundableCents(18900, 18900)).toBe(0);
    expect(refundableCents(18900, 20000)).toBe(0);
  });

  it('marks payment refunded or partial', () => {
    expect(paymentStatusAfterRefund(1000, 0)).toBe(PaymentStatus.SUCCEEDED);
    expect(paymentStatusAfterRefund(1000, 400)).toBe(PaymentStatus.PARTIALLY_REFUNDED);
    expect(paymentStatusAfterRefund(1000, 1000)).toBe(PaymentStatus.REFUNDED);
  });

  it('restocks only while the piece is still here', () => {
    expect(shouldRestockOnRefund(OrderStatus.CONFIRMED, FulfillmentMethod.COLLECTION)).toBe(true);
    expect(shouldRestockOnRefund(OrderStatus.PACKING, FulfillmentMethod.DELIVERY)).toBe(true);
    expect(shouldRestockOnRefund(OrderStatus.DELIVERED, FulfillmentMethod.DELIVERY)).toBe(false);
    expect(shouldRestockOnRefund(OrderStatus.SHIPPED, FulfillmentMethod.DELIVERY)).toBe(false);
    expect(shouldRestockOnRefund(OrderStatus.COLLECTED, FulfillmentMethod.COLLECTION)).toBe(false);
  });

  it('labels cash vs Stripe refs', () => {
    expect(isCashPayment('CASH')).toBe(true);
    expect(refundProviderLabel('cash:abc')).toBe('Cash drawer');
    expect(refundProviderLabel('re_123')).toBe('Stripe');
  });
});
