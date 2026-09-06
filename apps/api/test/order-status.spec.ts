import { describe, expect, it } from 'vitest';
import { canTransitionOrder, carrierTrackUrl, nextOrderStatus } from '@motive-fashion/config';

describe('order status machine', () => {
  it('walks delivery Paid → Packing → Shipped → Delivered', () => {
    expect(nextOrderStatus('DELIVERY', 'CONFIRMED')).toBe('PACKING');
    expect(nextOrderStatus('DELIVERY', 'PACKING')).toBe('SHIPPED');
    expect(nextOrderStatus('DELIVERY', 'SHIPPED')).toBe('DELIVERED');
    expect(nextOrderStatus('DELIVERY', 'DELIVERED')).toBeNull();
    expect(canTransitionOrder('DELIVERY', 'PACKING', 'READY_FOR_COLLECTION')).toBe(false);
  });

  it('walks collection Paid → Packing → Ready → Collected', () => {
    expect(nextOrderStatus('COLLECTION', 'CONFIRMED')).toBe('PACKING');
    expect(nextOrderStatus('COLLECTION', 'PACKING')).toBe('READY_FOR_COLLECTION');
    expect(nextOrderStatus('COLLECTION', 'READY_FOR_COLLECTION')).toBe('COLLECTED');
    expect(canTransitionOrder('COLLECTION', 'PACKING', 'SHIPPED')).toBe(false);
  });

  it('builds an An Post tracking URL', () => {
    expect(carrierTrackUrl('AN_POST', 'CE123456789IE')).toContain('CE123456789IE');
  });
});
