import { FulfillmentMethod, OrderStatus, PaymentStatus } from '@prisma/client';

export function refundableCents(totalCents: number, alreadyRefunded: number) {
  return Math.max(0, totalCents - Math.max(0, alreadyRefunded));
}

export function paymentStatusAfterRefund(totalCents: number, refundedCents: number): PaymentStatus {
  if (refundedCents <= 0) return PaymentStatus.SUCCEEDED;
  if (refundedCents >= totalCents) return PaymentStatus.REFUNDED;
  return PaymentStatus.PARTIALLY_REFUNDED;
}

export function shouldRestockOnRefund(status: OrderStatus, _fulfillment?: FulfillmentMethod) {
  return (
    status === OrderStatus.PENDING_PAYMENT ||
    status === OrderStatus.CONFIRMED ||
    status === OrderStatus.PACKING ||
    status === OrderStatus.READY_FOR_COLLECTION
  );
}

export function isCashPayment(method?: string | null) {
  return method?.toUpperCase() === 'CASH';
}

export function refundProviderLabel(providerRef?: string | null) {
  if (!providerRef) return 'Recorded';
  if (providerRef.startsWith('cash:')) return 'Cash drawer';
  if (providerRef.startsWith('mock:')) return 'Test';
  if (providerRef.startsWith('re_')) return 'Stripe';
  return 'Recorded';
}
