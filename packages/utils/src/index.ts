export type CatalogList<T> = { items: T[]; nextCursor: string | null };

export function unwrapCatalogList<T>(payload: unknown): CatalogList<T> {
  if (Array.isArray(payload)) return { items: payload as T[], nextCursor: null };
  if (payload && typeof payload === 'object' && Array.isArray((payload as CatalogList<T>).items)) {
    const page = payload as CatalogList<T>;
    return { items: page.items, nextCursor: page.nextCursor ?? null };
  }
  return { items: [], nextCursor: null };
}

export function formatEur(cents: number): string {
  return new Intl.NumberFormat('en-IE', {
    style: 'currency',
    currency: 'EUR',
  }).format(cents / 100);
}

export function splitVatInclusive(grossCents: number, rate = 0.23) {
  const netCents = Math.round(grossCents / (1 + rate));
  const taxCents = grossCents - netCents;
  return { netCents, taxCents, grossCents };
}

export function availableStock(onHand: number, reserved: number): number {
  return Math.max(0, onHand - reserved);
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/[\s_]+/g, '-');
}

/** PERCENT `value` is basis points (1000 = 10%, 10000 = 100%). FIXED is EUR cents. */
export function promoDiscountCents(
  subtotalCents: number,
  type: 'PERCENT' | 'FIXED',
  value: number,
) {
  if (subtotalCents < 1 || value < 1) return 0;
  if (type === 'PERCENT') {
    return Math.min(subtotalCents, Math.round(subtotalCents * (value / 10000)));
  }
  return Math.min(subtotalCents, value);
}

export type PromoWindow = {
  active: boolean;
  startsAt?: Date | string | null;
  endsAt?: Date | string | null;
  maxUses?: number | null;
  usedCount?: number;
};

export type PromoStatus = 'inactive' | 'scheduled' | 'live' | 'expired' | 'exhausted';

export const PROMO_STATUS_LABEL: Record<PromoStatus, string> = {
  live: 'Live',
  scheduled: 'Scheduled',
  expired: 'Expired',
  exhausted: 'Used up',
  inactive: 'Off',
};

export function promoStatus(promo: PromoWindow, now = new Date()): PromoStatus {
  if (!promo.active) return 'inactive';
  if (promo.maxUses != null && (promo.usedCount ?? 0) >= promo.maxUses) return 'exhausted';
  const start = promo.startsAt ? new Date(promo.startsAt) : null;
  const end = promo.endsAt ? new Date(promo.endsAt) : null;
  if (start && !Number.isNaN(start.getTime()) && start > now) return 'scheduled';
  if (end && !Number.isNaN(end.getTime()) && end < now) return 'expired';
  return 'live';
}

/** Null means the code can be applied now. */
export function promoRejectReason(promo: PromoWindow, now = new Date()) {
  const status = promoStatus(promo, now);
  if (status === 'inactive') return 'This promo code is switched off.';
  if (status === 'scheduled') return 'This promo code is not valid yet.';
  if (status === 'expired') return 'This promo code has expired.';
  if (status === 'exhausted') return 'This promo code has no uses left.';
  return null;
}

export function promoOfferLabel(type: 'PERCENT' | 'FIXED', value: number) {
  if (type === 'PERCENT') {
    const pct = value / 100;
    return `${Number.isInteger(pct) ? String(pct) : pct.toFixed(1)}% off`;
  }
  return `${formatEur(value)} off`;
}

/** Outbound delivery quote. Collection uses the method fee; free-over applies to delivery only. */
export {
  applyPackScan,
  normalizeBinCode,
  packScanComplete,
  scanMatchesVariant,
  scanNeedle,
  type PackScanLine,
  type ScanVariant,
} from './scan';
export { code128Checksum, encodeCode128Modules } from './code128';
export { qrModules, qrSize, qrVersionFor } from './qr';
export {
  CATALOG_COLORS,
  CATALOG_OCCASIONS,
  CATALOG_SIZES,
  cartesianStyleRows,
  defaultProductDescription,
  styleComboKey,
  styleDefaultsForCategory,
  uniqueColors,
  uniqueSizes,
  variantSku,
  type StyleDefaults,
} from './style-catalog';
export {
  decodeWhatsappPicks,
  encodeWhatsappPicks,
  whatsappIntent,
  type WhatsappIntent,
} from './whatsapp-intent';

export function quoteShippingCents(input: {
  fulfillment: 'DELIVERY' | 'COLLECTION';
  goodsCents: number;
  collectionFeeCents: number;
  countyRateCents: number;
  freeOverCents: number | null;
}): number {
  if (input.fulfillment === 'COLLECTION') return Math.max(0, input.collectionFeeCents);
  if (input.freeOverCents != null && input.goodsCents >= input.freeOverCents) return 0;
  return Math.max(0, input.countyRateCents);
}
