export const CATALOG_SIZES = ['OS', 'XS', 'S', 'M', 'L', 'XL', 'XXL'] as const;

export const CATALOG_COLORS = [
  'Black',
  'Ivory',
  'Sage',
  'Navy',
  'Champagne',
  'Charcoal',
  'Deep emerald',
  'Taupe',
  'Grey',
  'White',
  'Blush',
  'Nude',
  'Gold',
  'Silver',
  'Pearl',
  'Sand',
  'Olive',
] as const;

export const CATALOG_OCCASIONS = ['daily', 'eid', 'prayer', 'winter'] as const;

export type StyleDefaults = {
  sizes: string[];
  colors: string[];
  occasion: (typeof CATALOG_OCCASIONS)[number];
  coverage: string | null;
  prayerReady: boolean;
  fabric: string;
  weightGrams: number;
};

const FALLBACK_DEFAULTS: StyleDefaults = {
  sizes: ['OS'],
  colors: ['Black'],
  occasion: 'daily',
  coverage: 'full',
  prayerReady: false,
  fabric: 'crepe',
  weightGrams: 200,
};

const CATEGORY_DEFAULTS: Record<string, StyleDefaults> = {
  hijabs: { ...FALLBACK_DEFAULTS, fabric: 'chiffon', weightGrams: 90 },
  niqabs: { ...FALLBACK_DEFAULTS, coverage: 'face', fabric: 'crepe', weightGrams: 45 },
  undercaps: { ...FALLBACK_DEFAULTS, coverage: null, fabric: 'cotton', weightGrams: 35 },
  accessories: {
    ...FALLBACK_DEFAULTS,
    colors: ['Gold'],
    coverage: null,
    fabric: 'metal',
    weightGrams: 25,
  },
  'prayer-sets': {
    ...FALLBACK_DEFAULTS,
    colors: ['White'],
    occasion: 'prayer',
    prayerReady: true,
    fabric: 'crepe',
    weightGrams: 320,
  },
  khimars: {
    ...FALLBACK_DEFAULTS,
    occasion: 'prayer',
    prayerReady: true,
    fabric: 'nida crepe',
    weightGrams: 260,
  },
  abayas: {
    ...FALLBACK_DEFAULTS,
    sizes: ['S', 'M', 'L'],
    fabric: 'nida crepe',
    weightGrams: 520,
  },
  dresses: {
    ...FALLBACK_DEFAULTS,
    sizes: ['S', 'M', 'L'],
    fabric: 'crepe',
    weightGrams: 420,
  },
  jilbabs: {
    ...FALLBACK_DEFAULTS,
    sizes: ['S', 'M', 'L'],
    occasion: 'prayer',
    prayerReady: true,
    fabric: 'nida crepe',
    weightGrams: 580,
  },
};

export function styleDefaultsForCategory(slug?: string | null): StyleDefaults {
  if (!slug) return FALLBACK_DEFAULTS;
  return CATEGORY_DEFAULTS[slug] ?? FALLBACK_DEFAULTS;
}

function skuToken(value: string) {
  return value
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Same pattern as seed: MF-{slug}-{size}-{colour}, max 40 chars. */
export function variantSku(productSlug: string, size: string, color: string, max = 40) {
  const sizePart = skuToken(size) || 'OS';
  const colorPart = skuToken(color) || 'NA';
  const suffix = `-${sizePart}-${colorPart}`;
  const prefix = 'MF-';
  const budget = max - prefix.length - suffix.length;
  let slugPart = skuToken(productSlug);
  if (budget < 1) return `${prefix}${sizePart}-${colorPart}`.slice(0, max).replace(/-$/g, '');
  if (slugPart.length > budget) slugPart = slugPart.slice(0, budget).replace(/-$/g, '');
  if (!slugPart) slugPart = 'STYLE';
  return `${prefix}${slugPart}${suffix}`;
}

export function styleComboKey(size: string, color: string) {
  return `${size.trim().toLowerCase()}|${color.trim().toLowerCase()}`;
}

export function cartesianStyleRows(sizes: string[], colors: string[]) {
  const rows: { size: string; color: string }[] = [];
  for (const size of sizes) {
    for (const color of colors) {
      rows.push({ size, color });
    }
  }
  return rows;
}

export function defaultProductDescription(title: string, _categoryName?: string | null) {
  const name = title.trim() || 'This piece';
  return `${name} for the Dublin shop.`;
}

export function uniqueColors(variants: { color: string }[]) {
  return [...new Set(variants.map((row) => row.color).filter(Boolean))];
}

export function uniqueSizes(variants: { size: string }[]) {
  return [...new Set(variants.map((row) => row.size).filter(Boolean))];
}
