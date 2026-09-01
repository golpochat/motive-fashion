export const BRAND = {
  name: 'Motive Fashion',
  legalName: 'Motive Fashion Limited',
  city: 'Dublin',
  country: 'Ireland',
  currency: 'EUR',
  currencySymbol: '€',
  vatRateBps: 2300,
  vatRate: 0.23,
  supportEmail: 'hello@motivefashion.ie',
  whatsappDisplay: '+353',
  reservationMinutes: 15,
  returnDays: 14,
} as const;

export const CHANNELS = ['web', 'whatsapp', 'pos', 'mobile'] as const;
export type SalesChannel = (typeof CHANNELS)[number];
