import { countyLabel, formatIrelandAddress } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';

export type ReceiptItem = {
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
};

export type ReceiptAddress = {
  line1: string;
  line2?: string | null;
  city: string;
  county?: string | null;
  eircode?: string | null;
};

export type ReceiptOrder = {
  id: string;
  name: string;
  email: string;
  trackingToken: string;
  fulfillment: string;
  shippingCounty?: string | null;
  giftNote?: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  items: ReceiptItem[];
  address?: ReceiptAddress | null;
  promo?: { code: string } | null;
  carrier?: string | null;
  trackingNo?: string | null;
  status?: string;
};

export function fulfilmentLabel(order: ReceiptOrder) {
  if (order.fulfillment === 'COLLECTION') return 'Collect in Dublin';
  const county = countyLabel(order.shippingCounty);
  return county ? `Ireland delivery · ${county}` : 'Ireland delivery';
}

export function shippingLabel(order: ReceiptOrder) {
  if (order.fulfillment === 'COLLECTION') return 'Collection';
  return 'Delivery';
}

export function shippingAmount(order: ReceiptOrder) {
  return order.shippingCents === 0 ? 'Free' : formatEur(order.shippingCents);
}

export function discountLabel(order: ReceiptOrder) {
  return order.promo?.code ? `Discount (${order.promo.code})` : 'Discount';
}

export function addressLine(order: ReceiptOrder) {
  return order.address ? formatIrelandAddress(order.address) : null;
}

export function trackUrl(order: ReceiptOrder) {
  const site = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  return `${site}/order/${order.id}?token=${order.trackingToken}`;
}

export function receiptFilename(order: ReceiptOrder) {
  return `motive-fashion-receipt-${order.id.slice(0, 8)}.pdf`;
}

export function toReceiptOrder(
  order: ReceiptOrder & { shipments?: { carrier?: string | null; trackingNo?: string | null }[] },
): ReceiptOrder {
  return {
    id: order.id,
    name: order.name,
    email: order.email,
    trackingToken: order.trackingToken,
    fulfillment: order.fulfillment,
    shippingCounty: order.shippingCounty,
    giftNote: order.giftNote,
    subtotalCents: order.subtotalCents,
    discountCents: order.discountCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    items: order.items.map((item) => ({
      title: item.title,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPriceCents: item.unitPriceCents,
    })),
    address: order.address
      ? {
          line1: order.address.line1,
          line2: order.address.line2,
          city: order.address.city,
          county: order.address.county,
          eircode: order.address.eircode,
        }
      : null,
    promo: order.promo ? { code: order.promo.code } : null,
    carrier: order.carrier ?? order.shipments?.[0]?.carrier ?? null,
    trackingNo: order.trackingNo ?? order.shipments?.[0]?.trackingNo ?? null,
    status: order.status,
  };
}
