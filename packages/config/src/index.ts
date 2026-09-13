export const BRAND = {
  name: 'Motive Fashion',
  legalName: 'Motive Fashion Limited',
  city: 'Dublin',
  country: 'Ireland',
  currency: 'EUR',
  currencySymbol: '€',
  vatRateBps: 2300,
  vatRate: 0.23,
  supportEmail: 'hello@motivefashion.com',
  whatsappDisplay: '+353',
  reservationMinutes: 15,
  returnDays: 14,
} as const;

/**
 * Ramadan and Eid sit in chrome only during merchandising windows (Europe/Dublin).
 * Collection URLs stay live year-round for campaigns and search.
 */
export const SEASONAL_NAV = [
  {
    href: '/collections/ramadan',
    label: 'Ramadan',
    cta: 'Ramadan collection',
    windows: [
      ['2026-01-07', '2026-03-20'],
      ['2026-12-28', '2027-03-10'],
      ['2027-12-17', '2028-02-27'],
    ],
  },
  {
    href: '/collections/eid',
    label: 'Eid',
    cta: 'Eid collection',
    windows: [
      ['2026-03-01', '2026-04-03'],
      ['2026-05-10', '2026-06-10'],
      ['2027-02-20', '2027-03-24'],
      ['2027-04-30', '2027-05-30'],
      ['2028-02-10', '2028-03-12'],
      ['2028-04-20', '2028-05-19'],
    ],
  },
] as const;

export function dublinDay(at = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Dublin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(at);
}

export function isDateInWindows(windows: readonly (readonly [string, string])[], at = new Date()) {
  const day = dublinDay(at);
  return windows.some(([from, to]) => day >= from && day <= to);
}

export function liveSeasonalNav(at = new Date()) {
  return SEASONAL_NAV.filter((item) => isDateInWindows(item.windows, at));
}

/** Homepage secondary CTA. Eid wins when both windows overlap. */
export function liveSeasonalCta(at = new Date()) {
  const live = liveSeasonalNav(at);
  return live.find((item) => item.label === 'Eid') ?? live[0] ?? null;
}

/** NIST-aligned minimum for new accounts. */
export const PASSWORD_MIN_LENGTH = 8;

export const PALETTE = {
  ink: '#1c1917',
  cream: '#f5f0e8',
  clay: '#b08968',
  moss: '#3f4a3c',
  gold: '#c4a574',
  sage: '#8c9b82',
  rose: '#ad7e6e',
} as const;

/** Mirrors Prisma `SalesChannel`. */
export const CHANNELS = ['WEB', 'WHATSAPP', 'POS', 'MOBILE'] as const;
export type SalesChannel = (typeof CHANNELS)[number];

export const CHANNEL_LABEL: Record<SalesChannel, string> = {
  WEB: 'Web',
  WHATSAPP: 'WhatsApp',
  POS: 'Till',
  MOBILE: 'App',
};

/** Default Ireland delivery rate (VAT-inc cents). Admin can override per county. */
export const DEFAULT_COUNTY_RATE_CENTS = 595;

/** Free Ireland delivery when goods (after discount) meet this amount. */
export const DEFAULT_FREE_SHIP_OVER_CENTS = 12000;

/** Republic of Ireland — 26 counties. `code` is stored on addresses and orders. */
export const IE_COUNTIES = [
  { code: 'DUBLIN', name: 'Dublin' },
  { code: 'CARLOW', name: 'Carlow' },
  { code: 'CAVAN', name: 'Cavan' },
  { code: 'CLARE', name: 'Clare' },
  { code: 'CORK', name: 'Cork' },
  { code: 'DONEGAL', name: 'Donegal' },
  { code: 'GALWAY', name: 'Galway' },
  { code: 'KERRY', name: 'Kerry' },
  { code: 'KILDARE', name: 'Kildare' },
  { code: 'KILKENNY', name: 'Kilkenny' },
  { code: 'LAOIS', name: 'Laois' },
  { code: 'LEITRIM', name: 'Leitrim' },
  { code: 'LIMERICK', name: 'Limerick' },
  { code: 'LONGFORD', name: 'Longford' },
  { code: 'LOUTH', name: 'Louth' },
  { code: 'MAYO', name: 'Mayo' },
  { code: 'MEATH', name: 'Meath' },
  { code: 'MONAGHAN', name: 'Monaghan' },
  { code: 'OFFALY', name: 'Offaly' },
  { code: 'ROSCOMMON', name: 'Roscommon' },
  { code: 'SLIGO', name: 'Sligo' },
  { code: 'TIPPERARY', name: 'Tipperary' },
  { code: 'WATERFORD', name: 'Waterford' },
  { code: 'WESTMEATH', name: 'Westmeath' },
  { code: 'WEXFORD', name: 'Wexford' },
  { code: 'WICKLOW', name: 'Wicklow' },
] as const;

export const RETURN_POSTAGE_NOTICE =
  'Change of mind after dispatch: we refund the items. You pay return postage to us. Cancel before we ship: full refund. Faulty goods: we cover the return.';

export const ORDER_STATUS_LABEL: Record<string, string> = {
  PENDING_PAYMENT: 'Awaiting payment',
  CONFIRMED: 'Paid',
  PACKING: 'Packing',
  SHIPPED: 'Shipped',
  READY_FOR_COLLECTION: 'Ready to collect',
  DELIVERED: 'Delivered',
  COLLECTED: 'Collected',
  CANCELLED: 'Cancelled',
  REFUNDED: 'Refunded',
};

export const ORDER_ACTION_LABEL: Record<string, string> = {
  PACKING: 'Pack',
  SHIPPED: 'Mark shipped',
  READY_FOR_COLLECTION: 'Ready to collect',
  DELIVERED: 'Mark delivered',
  COLLECTED: 'Mark collected',
};

export const DELIVERY_STEPS = ['CONFIRMED', 'PACKING', 'SHIPPED', 'DELIVERED'] as const;
export const COLLECTION_STEPS = ['CONFIRMED', 'PACKING', 'READY_FOR_COLLECTION', 'COLLECTED'] as const;

export const SHIP_CARRIERS = [
  {
    code: 'AN_POST',
    name: 'An Post',
    trackUrl: (trackingNo: string) =>
      `https://www.anpost.com/Post-Parcels/Track/History?item=${encodeURIComponent(trackingNo)}`,
  },
  {
    code: 'DPD',
    name: 'DPD',
    trackUrl: (trackingNo: string) =>
      `https://www.dpd.ie/service/tracking?parcelNumber=${encodeURIComponent(trackingNo)}`,
  },
  {
    code: 'FASTWAY',
    name: 'Fastway',
    trackUrl: (trackingNo: string) =>
      `https://www.fastway.ie/courier-services/track-your-parcel/?l=${encodeURIComponent(trackingNo)}`,
  },
  {
    code: 'NIGHTLINE',
    name: 'Nightline',
    trackUrl: (trackingNo: string) =>
      `https://www.nightline.ie/tracking/${encodeURIComponent(trackingNo)}`,
  },
  { code: 'OTHER', name: 'Other', trackUrl: null },
] as const;

export function fulfilmentSteps(fulfillment?: string | null) {
  return fulfillment === 'COLLECTION' ? COLLECTION_STEPS : DELIVERY_STEPS;
}

export function nextOrderStatus(fulfillment: string | null | undefined, current: string) {
  const steps = fulfilmentSteps(fulfillment);
  const index = (steps as readonly string[]).indexOf(current);
  if (index < 0 || index >= steps.length - 1) return null;
  return steps[index + 1] ?? null;
}

export function canTransitionOrder(
  fulfillment: string | null | undefined,
  from: string,
  to: string,
) {
  return nextOrderStatus(fulfillment, from) === to;
}

export function carrierTrackUrl(carrier?: string | null, trackingNo?: string | null) {
  if (!trackingNo) return null;
  const hit = SHIP_CARRIERS.find((row) => row.code === carrier);
  return hit?.trackUrl ? hit.trackUrl(trackingNo) : null;
}

export function carrierLabel(carrier?: string | null) {
  if (!carrier) return '';
  return SHIP_CARRIERS.find((row) => row.code === carrier)?.name ?? carrier;
}

export function countyLabel(code?: string | null) {
  if (!code) return '';
  const hit = IE_COUNTIES.find((row) => row.code === code.toUpperCase());
  return hit?.name ?? code;
}

/** Mills we buy from. `code` is ISO 3166-1 alpha-2, stored on Supplier.country. */
export const SUPPLIER_COUNTRIES = [
  { code: 'BD', name: 'Bangladesh' },
  { code: 'CN', name: 'China' },
  { code: 'EG', name: 'Egypt' },
  { code: 'IN', name: 'India' },
  { code: 'ID', name: 'Indonesia' },
  { code: 'IE', name: 'Ireland' },
  { code: 'JO', name: 'Jordan' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'MA', name: 'Morocco' },
  { code: 'PK', name: 'Pakistan' },
  { code: 'SA', name: 'Saudi Arabia' },
  { code: 'TN', name: 'Tunisia' },
  { code: 'TR', name: 'Turkey' },
  { code: 'AE', name: 'United Arab Emirates' },
  { code: 'GB', name: 'United Kingdom' },
] as const;

export type SupplierCountryCode = (typeof SUPPLIER_COUNTRIES)[number]['code'];

export const DEFAULT_SUPPLIER_COUNTRY: SupplierCountryCode = 'TR';

export function supplierCountryLabel(code?: string | null) {
  if (!code) return '';
  const hit = SUPPLIER_COUNTRIES.find(
    (row) => row.code === code.trim().toUpperCase() || row.name.toLowerCase() === code.trim().toLowerCase(),
  );
  return hit?.name ?? code;
}

export function supplierCountryCode(value?: string | null): SupplierCountryCode | null {
  if (!value) return null;
  const trimmed = value.trim();
  const byCode = SUPPLIER_COUNTRIES.find((row) => row.code === trimmed.toUpperCase());
  if (byCode) return byCode.code;
  const byName = SUPPLIER_COUNTRIES.find((row) => row.name.toLowerCase() === trimmed.toLowerCase());
  return byName?.code ?? null;
}

export function formatIrelandAddress(address: {
  line1: string;
  line2?: string | null;
  city: string;
  county?: string | null;
  eircode?: string | null;
}) {
  const county = countyLabel(address.county);
  const city = address.city.trim();
  const skipCounty = Boolean(county && city.toLowerCase().includes(county.toLowerCase()));
  return [address.line1, address.line2, city, skipCounty ? null : county, address.eircode]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

export const ADDRESS_LABELS = [
  { code: 'HOME', name: 'Home' },
  { code: 'WORK', name: 'Work' },
  { code: 'FAMILY', name: 'Family' },
  { code: 'OTHER', name: 'Other' },
] as const;

export type AddressLabelCode = (typeof ADDRESS_LABELS)[number]['code'];

export function addressLabelName(code?: string | null) {
  if (!code) return '';
  const hit = ADDRESS_LABELS.find((row) => row.code === code.toUpperCase() || row.name.toLowerCase() === code.toLowerCase());
  return hit?.name ?? code;
}

export function addressLabelCode(value?: string | null): AddressLabelCode {
  if (!value) return 'HOME';
  const upper = value.trim().toUpperCase();
  const byCode = ADDRESS_LABELS.find((row) => row.code === upper);
  if (byCode) return byCode.code;
  const byName = ADDRESS_LABELS.find((row) => row.name.toLowerCase() === value.trim().toLowerCase());
  return byName?.code ?? 'OTHER';
}

export function normalizeEircode(value: string) {
  const compact = value.replace(/\s+/g, '').toUpperCase();
  if (compact.length !== 7) return compact;
  return `${compact.slice(0, 3)} ${compact.slice(3)}`;
}

export function isValidEircode(value: string) {
  return /^(?:[A-Z]\d{2}|D6W) [A-Z0-9]{4}$/.test(normalizeEircode(value));
}
