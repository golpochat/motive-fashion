import { describe, expect, it } from 'vitest';
import { orderPaidHtml } from '../src/common/receipt-html';
import { buildReceiptPdf } from '../src/common/receipt-pdf';
import type { ReceiptOrder } from '../src/common/receipt';

const sample: ReceiptOrder = {
  id: 'ef6ee9d6-1111-2222-3333-444444444444',
  name: 'Sujan Hossain',
  email: 'guest@motivefashion.com',
  trackingToken: 'track-token',
  fulfillment: 'DELIVERY',
  shippingCounty: 'DUBLIN',
  giftNote: null,
  subtotalCents: 7900,
  discountCents: 0,
  shippingCents: 595,
  taxCents: 1589,
  totalCents: 8495,
  items: [
    {
      title: 'Everyday nida abaya',
      size: 'M',
      color: 'Black',
      quantity: 1,
      unitPriceCents: 7900,
    },
  ],
  address: {
    line1: '1 Grafton Street',
    line2: null,
    city: 'Dublin',
    county: 'DUBLIN',
    eircode: 'D02 AF30',
  },
  promo: null,
};

describe('order confirmation receipt', () => {
  it('renders the branded HTML with the full order id and line details', () => {
    const html = orderPaidHtml(sample, { inlineLogo: true });
    expect(html).toContain(sample.id);
    expect(html).toContain('Everyday nida abaya');
    expect(html).toContain('M / Black');
    expect(html).toContain('Ireland delivery · Dublin');
    expect(html).toContain('1 Grafton Street, Dublin, D02 AF30');
    expect(html).toContain('cid:brand-mark');
    expect(html).toContain('A PDF receipt is attached');
  });

  it('builds a single-page PDF receipt', async () => {
    const pdf = await buildReceiptPdf(sample);
    expect(pdf.subarray(0, 5).toString('utf8')).toBe('%PDF-');
    expect(pdf.length).toBeGreaterThan(1000);
    const body = pdf.toString('latin1');
    const count = body.match(/\/Count\s+(\d+)/);
    expect(count?.[1]).toBe('1');
  });
});
