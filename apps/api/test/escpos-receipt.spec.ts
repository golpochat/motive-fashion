import { describe, expect, it } from 'vitest';
import { buildEscPosReceipt, tillTicketNo } from '../src/modules/pos/escpos-receipt';
import { wordmarkToEscPosRaster } from '../src/modules/pos/escpos-logo';

const base = {
  id: 'ef6ee9d6-1111-2222-3333-444444444444',
  name: 'Walk-in',
  createdAt: new Date('2026-09-08T12:00:00Z'),
  totalCents: 7900,
  taxCents: 1477,
  subtotalCents: 7900,
  discountCents: 0,
  shippingCents: 0,
  fulfillment: 'COLLECTION',
  paymentMethod: 'CASH',
  items: [
    {
      title: 'Everyday nida abaya',
      sku: 'ABY-NDA-M-BLK',
      size: 'M',
      color: 'Black',
      quantity: 1,
      unitPriceCents: 7900,
    },
  ],
};

describe('ESC/POS till ticket', () => {
  it('builds a TM-T20III ticket without euro glyphs and with a cut', () => {
    const { payload, preview } = buildEscPosReceipt(base);
    expect(preview).toContain('[logo]');
    expect(preview).toContain('MOTIVE FASHION');
    expect(preview).toContain('Motive Fashion');
    expect(preview).not.toContain('Limited');
    expect(preview).toContain('Dublin, Ireland');
    expect(preview).toContain('hello@motivefashion.com');
    expect(preview).toContain('Ticket');
    expect(preview).toContain(tillTicketNo(base.id));
    expect(preview).toContain('Collect in Dublin');
    expect(preview).toContain('Everyday nida abaya');
    expect(preview).toContain('SKU ABY-NDA-M-BLK');
    expect(preview).toContain('Total');
    expect(preview).not.toContain('Goods ex VAT');
    expect(preview).not.toContain('Total inc. VAT');
    expect(preview).toContain('14-day returns');
    expect(preview.split('\n').find((line) => line.startsWith('Ticket'))?.length).toBe(48);
    const title = preview.split('\n').find((line) => line.includes('Everyday nida abaya'));
    expect(title?.startsWith('Everyday nida abaya')).toBe(true);
    const price = preview.split('\n').find((line) => line.includes('1 x 79.00'));
    expect(price?.length).toBe(48);
    expect(price?.endsWith('EUR 79.00')).toBe(true);
    expect(payload[0]).toBe(0x1b);
    expect(payload[1]).toBe(0x40);
    expect(payload.includes(Buffer.from([0x1d, 0x21, 0x33]))).toBe(false);
    expect(payload.includes(Buffer.from([0x1d, 0x76, 0x30]))).toBe(true);
    expect(payload.includes(Buffer.from([0x1d, 0x56, 0x41, 0x18]))).toBe(true);
    expect(payload.includes(Buffer.from([0x1d, 0x6b, 73]))).toBe(true);
    expect(payload.includes(Buffer.from([0x1d, 0x68, 120]))).toBe(true);
    expect(payload.includes(Buffer.from([0x1d, 0x77, 3]))).toBe(true);
    let rasters = 0;
    for (let i = 0; i < payload.length - 2; i++) {
      if (payload[i] === 0x1d && payload[i + 1] === 0x76 && payload[i + 2] === 0x30) rasters += 1;
    }
    expect(rasters).toBeGreaterThanOrEqual(2);
  });

  it('renders MOTIVE FASHION as a graphic, not till glyphs', () => {
    const wordmark = wordmarkToEscPosRaster('MOTIVE FASHION', 512);
    expect(wordmark).toBeTruthy();
    expect(wordmark?.subarray(0, 3).equals(Buffer.from([0x1d, 0x76, 0x30]))).toBe(true);
  });

  it('prints cash tendered and change on a till ticket', () => {
    const { preview } = buildEscPosReceipt({
      ...base,
      tenderedCents: 10000,
      changeCents: 2100,
    });
    expect(preview).toContain('Cash tendered');
    expect(preview).toContain('EUR 100.00');
    expect(preview).toContain('Change');
    expect(preview).toContain('EUR 21.00');
  });

  it('prints delivery, VAT number, and card when those are set', () => {
    const { preview, payload } = buildEscPosReceipt({
      ...base,
      fulfillment: 'DELIVERY',
      shippingCounty: 'DUBLIN',
      shippingCents: 595,
      paymentMethod: 'CARD',
      vatNumber: 'IE1234567T',
      trackingToken: 'track-token',
    });
    expect(preview).toContain('Ireland delivery - Dublin');
    expect(preview).toContain('VAT IE1234567T');
    expect(preview).toContain('Delivery');
    expect(preview).toContain('Card');
    expect(preview).toContain('Scan to view this order');
    expect(preview).not.toContain('Cash tendered');
    expect(payload.includes(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 49, 67, 7]))).toBe(true);
    expect(payload.includes(Buffer.from([0x1d, 0x28, 0x6b, 0x03, 0x00, 49, 69, 49]))).toBe(true);
  });

  it('prints a VAT breakdown when the trader is registered', () => {
    const prev = process.env.VAT_REGISTERED;
    process.env.VAT_REGISTERED = 'true';
    try {
      const { preview } = buildEscPosReceipt(base);
      expect(preview).toContain('Goods ex VAT');
      expect(preview).toContain('VAT 23%');
      expect(preview).toContain('Total inc. VAT');
    } finally {
      if (prev === undefined) delete process.env.VAT_REGISTERED;
      else process.env.VAT_REGISTERED = prev;
    }
  });
});
