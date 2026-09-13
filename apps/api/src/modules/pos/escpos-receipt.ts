/** ESC/POS ticket for Epson TM-T20III (80mm, Font A = 48 cols). */

import { BRAND, countyLabel } from '@motive-fashion/config';
import { brandMarkPng } from '../../common/brand-assets';
import { pngToEscPosRaster, wordmarkToEscPosRaster } from './escpos-logo';

const COLS = 48;
const ESC = 0x1b;
const GS = 0x1d;

export type EscPosItem = {
  title: string;
  sku?: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
};

export type EscPosOrder = {
  id: string;
  name: string;
  email?: string | null;
  createdAt: Date;
  fulfillment: string;
  shippingCounty?: string | null;
  paymentMethod?: string;
  subtotalCents?: number;
  discountCents?: number;
  shippingCents?: number;
  taxCents?: number;
  totalCents: number;
  trackingToken?: string;
  vatNumber?: string;
  items: EscPosItem[];
  tenderedCents?: number;
  changeCents?: number;
};

const INIT = Buffer.from([ESC, 0x40]);
const CENTER = Buffer.from([ESC, 0x61, 1]);
const LEFT = Buffer.from([ESC, 0x61, 0]);
const CUT = Buffer.from([GS, 0x56, 0x41, 0x18]);

function ticketRef(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

function eur(cents: number) {
  return `EUR ${(cents / 100).toFixed(2)}`;
}

function ascii(value: string) {
  return value.replace(/€/g, 'EUR ').replace(/·/g, '-').replace(/[^\x20-\x7E]/g, '?');
}

function wrap(text: string, width = COLS) {
  const clean = ascii(text);
  const out: string[] = [];
  for (const paragraph of clean.split('\n')) {
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      const next = line ? `${line} ${word}` : word;
      if (next.length <= width) {
        line = next;
        continue;
      }
      if (line) out.push(line);
      if (word.length <= width) {
        line = word;
        continue;
      }
      let rest = word;
      while (rest.length > width) {
        out.push(rest.slice(0, width));
        rest = rest.slice(width);
      }
      line = rest;
    }
    out.push(line);
  }
  return out;
}

function pair(left: string, right: string) {
  const l = ascii(left);
  const r = ascii(right);
  const gap = COLS - l.length - r.length;
  if (gap < 1) return `${l}\n${r.padStart(COLS)}`;
  return `${l}${' '.repeat(gap)}${r}`;
}

function rule() {
  return '-'.repeat(COLS);
}

function fulfilmentLine(order: EscPosOrder) {
  if (order.fulfillment === 'COLLECTION') return 'Collect in Dublin';
  const county = countyLabel(order.shippingCounty);
  return county ? `Ireland delivery · ${county}` : 'Ireland delivery';
}

function payLabel(method?: string) {
  return method?.toUpperCase() === 'CASH' ? 'Cash' : 'Card';
}

function textLine(value: string) {
  return Buffer.from(`${ascii(value)}\n`, 'ascii');
}

function padCenter(text: string, width = COLS) {
  return wrap(text, width).map((line) => {
    if (line.length >= COLS) return line;
    return `${' '.repeat(Math.floor((COLS - line.length) / 2))}${line}`;
  });
}

/** Height in dots (~15 mm on TM-T20III). Module width 2–6; 3 fills an 8-char ticket on 80 mm. */
const BARCODE_HEIGHT = 120;
const BARCODE_MODULE = 3;
/** QR module size 1–16. 7 is ~40 mm for a typical order URL — phone-scannable, still inside 80 mm. */
const QR_MODULE = 7;
const QR_EC_M = 49;

function code128(data: string) {
  const body = `{B${ascii(data)}`;
  return Buffer.concat([
    Buffer.from('\n', 'ascii'),
    Buffer.from([GS, 0x48, 2]),
    Buffer.from([GS, 0x68, BARCODE_HEIGHT]),
    Buffer.from([GS, 0x77, BARCODE_MODULE]),
    Buffer.from([GS, 0x6b, 73, body.length]),
    Buffer.from(body, 'ascii'),
    Buffer.from('\n\n', 'ascii'),
  ]);
}

function qr(data: string) {
  const bytes = Buffer.from(ascii(data), 'ascii');
  const p = bytes.length + 3;
  return Buffer.concat([
    Buffer.from([GS, 0x28, 0x6b, 0x04, 0x00, 49, 65, 50, 0]),
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 49, 67, QR_MODULE]),
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 49, 69, QR_EC_M]),
    Buffer.from([GS, 0x28, 0x6b, p % 256, Math.floor(p / 256), 49, 80, 48]),
    bytes,
    Buffer.from([GS, 0x28, 0x6b, 0x03, 0x00, 49, 81, 48]),
    Buffer.from('\n\n', 'ascii'),
  ]);
}

export function tillTicketNo(id: string) {
  return ticketRef(id);
}

export function buildEscPosReceipt(order: EscPosOrder) {
  const when = order.createdAt.toLocaleString('en-IE', { hour12: false });
  const ref = ticketRef(order.id);
  const vatPct = Math.round(BRAND.vatRate * 100);
  const taxCents = order.taxCents ?? Math.round(order.totalCents - order.totalCents / (1 + BRAND.vatRate));
  const netCents = order.totalCents - taxCents;
  const subtotal = order.subtotalCents ?? order.items.reduce((sum, item) => sum + item.unitPriceCents * item.quantity, 0);
  const discount = order.discountCents ?? 0;
  const shipping = order.shippingCents ?? 0;
  const vatNumber = order.vatNumber?.trim();
  const site = process.env.WEB_ORIGIN ?? 'https://motivefashion.com';
  const track = order.trackingToken
    ? `${site.replace(/\/$/, '')}/order/${order.id}?token=${order.trackingToken}`
    : null;
  const email =
    order.email && !order.email.toLowerCase().includes('@pos.motivefashion.ie') ? order.email : null;

  const header = [
    '[logo]',
    ...padCenter('MOTIVE FASHION'),
    ...padCenter(BRAND.legalName),
    ...padCenter(`${BRAND.city}, ${BRAND.country}`),
    ...padCenter(BRAND.supportEmail),
    ...(vatNumber ? padCenter(`VAT ${vatNumber}`) : []),
    '',
    ...padCenter('Assalamu alaikum'),
  ];

  const meta = [
    ...padCenter(when),
    pair('Ticket', ref),
    pair('Served', order.name || 'Walk-in'),
    pair('Fulfilment', fulfilmentLine(order)),
    pair('Pay', payLabel(order.paymentMethod)),
  ];
  if (email) meta.push(...padCenter(email));

  const items: string[] = [rule()];
  for (const item of order.items) {
    items.push(...wrap(item.title));
    items.push(`  ${item.size} / ${item.color}`);
    if (item.sku) items.push(`  SKU ${item.sku}`);
    items.push(pair(`${item.quantity} x ${(item.unitPriceCents / 100).toFixed(2)}`, eur(item.unitPriceCents * item.quantity)));
  }

  const totals = [
    rule(),
    pair('Subtotal', eur(subtotal)),
  ];
  if (discount > 0) totals.push(pair('Discount', `-${eur(discount)}`));
  if (order.fulfillment === 'DELIVERY') {
    totals.push(pair('Delivery', shipping === 0 ? 'Free' : eur(shipping)));
  }
  totals.push(pair('Goods ex VAT', eur(netCents)));
  totals.push(pair(`VAT ${vatPct}%`, eur(taxCents)));
  totals.push(pair('Total inc. VAT', eur(order.totalCents)));
  if (order.tenderedCents != null) {
    totals.push(pair('Cash tendered', eur(order.tenderedCents)));
    totals.push(pair('Change', eur(order.changeCents ?? Math.max(0, order.tenderedCents - order.totalCents))));
  } else if (payLabel(order.paymentMethod) === 'Card') {
    totals.push(pair('Card', eur(order.totalCents)));
  }
  totals.push(rule());

  const footer = [
    ...padCenter(
      `${BRAND.returnDays}-day returns. Change of mind after dispatch: you pay postage. Faulty goods: we cover return.`,
      36,
    ),
    ...padCenter('motivefashion.com/legal/returns'),
    '',
    ...padCenter('Thank you for shopping with us'),
    ...padCenter('motivefashion.com'),
  ];
  if (track) footer.push(...padCenter('Scan to view this order'));

  let logo: Buffer | null = null;
  let wordmark: Buffer | null = null;
  try {
    const mark = brandMarkPng();
    logo = mark ? pngToEscPosRaster(mark, 192) : null;
    wordmark = wordmarkToEscPosRaster('MOTIVE FASHION', 512);
  } catch {
    logo = null;
    wordmark = null;
  }
  const preview = [...header, '', ...meta, ...items, ...totals, ...footer].join('\n');
  const chunks: Buffer[] = [INIT, CENTER];
  if (logo) chunks.push(logo);
  if (wordmark) chunks.push(wordmark);
  else chunks.push(textLine('MOTIVE FASHION'));
  chunks.push(
    textLine(BRAND.legalName),
    textLine(`${BRAND.city}, ${BRAND.country}`),
    textLine(BRAND.supportEmail),
  );
  if (vatNumber) chunks.push(textLine(`VAT ${vatNumber}`));
  chunks.push(textLine(''), textLine('Assalamu alaikum'), textLine(''));
  chunks.push(textLine(when));
  if (email) chunks.push(textLine(email));
  chunks.push(LEFT);
  chunks.push(textLine(pair('Ticket', ref)));
  chunks.push(textLine(pair('Served', order.name || 'Walk-in')));
  chunks.push(textLine(pair('Fulfilment', fulfilmentLine(order))));
  chunks.push(textLine(pair('Pay', payLabel(order.paymentMethod))));
  chunks.push(textLine(rule()));
  for (const item of order.items) {
    chunks.push(LEFT);
    for (const line of wrap(item.title)) chunks.push(textLine(line));
    chunks.push(textLine(`  ${item.size} / ${item.color}`));
    if (item.sku) chunks.push(textLine(`  SKU ${item.sku}`));
    chunks.push(textLine(pair(`${item.quantity} x ${(item.unitPriceCents / 100).toFixed(2)}`, eur(item.unitPriceCents * item.quantity))));
  }
  for (const line of totals) chunks.push(textLine(line));
  chunks.push(CENTER);
  for (const line of wrap(
    `${BRAND.returnDays}-day returns. Change of mind after dispatch: you pay postage. Faulty goods: we cover return.`,
    36,
  )) {
    chunks.push(textLine(line));
  }
  chunks.push(textLine('motivefashion.com/legal/returns'));
  chunks.push(textLine(''));
  chunks.push(textLine('Thank you for shopping with us'));
  chunks.push(textLine('motivefashion.com'));
  if (track) chunks.push(textLine('Scan to view this order'));
  chunks.push(code128(ref));
  if (track) chunks.push(qr(track));
  chunks.push(LEFT, Buffer.from('\n\n\n', 'ascii'), CUT);
  return { payload: Buffer.concat(chunks), preview };
}
