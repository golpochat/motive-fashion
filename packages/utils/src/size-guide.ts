import { CATALOG_SIZES } from './style-catalog';

/** Letter sizes used on overlay and dress garments. OS is one-size accessories. */
export const GARMENT_LETTER_SIZES = CATALOG_SIZES.filter((size) => size !== 'OS');

export function catalogSizeLabel(size: string) {
  return size === 'OS' ? 'One size' : size;
}

export function cm(value: number) {
  return `${value} cm`;
}

export type OverlaySizeRow = {
  size: string;
  bust: number;
  length: number;
  sleeve: number;
  /** Recommended height range in cm, flats. */
  height: string;
};

export type DressSizeRow = {
  size: string;
  bust: number;
  hip: number;
  length: number;
  sleeve: number;
};

/**
 * House garment chart for abayas and jilbabs (modest overlay).
 * Bust is laid-flat doubled. Not an EN 13402 body-size chart.
 */
export const ABAYA_JILBAB_CHART: OverlaySizeRow[] = [
  { size: 'XS', bust: 96, length: 137, sleeve: 57, height: '150–157' },
  { size: 'S', bust: 102, length: 140, sleeve: 58, height: '155–163' },
  { size: 'M', bust: 108, length: 142, sleeve: 59, height: '160–168' },
  { size: 'L', bust: 114, length: 145, sleeve: 60, height: '165–173' },
  { size: 'XL', bust: 122, length: 147, sleeve: 61, height: '170–178' },
  { size: 'XXL', bust: 130, length: 150, sleeve: 62, height: '175–183' },
];

/** Modest calf-length dresses. Shorter than floor-length overlay pieces. */
export const DRESS_CHART: DressSizeRow[] = [
  { size: 'XS', bust: 88, hip: 96, length: 118, sleeve: 57 },
  { size: 'S', bust: 92, hip: 100, length: 120, sleeve: 58 },
  { size: 'M', bust: 98, hip: 106, length: 122, sleeve: 59 },
  { size: 'L', bust: 104, hip: 112, length: 124, sleeve: 60 },
  { size: 'XL', bust: 112, hip: 120, length: 126, sleeve: 61 },
  { size: 'XXL', bust: 120, hip: 128, length: 128, sleeve: 62 },
];

export const HIJAB_SPECS = [
  { name: 'Everyday chiffon', detail: '180 × 70 cm rectangle.' },
  { name: 'Satin square', detail: '90 × 90 cm.' },
  { name: 'Jersey instant', detail: 'One size; stretch cap fits a 54–60 cm head.' },
] as const;

export const SIZE_GUIDE_INTRO =
  'These are Motive house garment measurements in centimetres, not EU clothing body sizes. Abayas and jilbabs are modest overlays, so garment bust is larger than a fitted dress. If you are between sizes, take the larger.';

export const SIZE_GUIDE_MEASURE_STEPS = [
  'Bust: around the fullest part of the chest, tape level and not tight. Compare that to the garment bust column — the number is already doubled from a laid-flat measure.',
  'Hip (dresses): around the fullest part of the hips, over the underwear you would wear with the piece.',
  'Height (abayas and jilbabs): stand in flats. Choose a size whose height range matches yours so the hem sits near the floor without pooling.',
  'Sleeve: shoulder seam to cuff. Modest sleeves are long; if you have a longer arm, take the larger size.',
] as const;

export const ONE_SIZE_COPY =
  'Niqabs, khimars, prayer sets, undercaps, magnets, and pins are one size (shown as OS on SKUs). Khimars have a snug cap; if you wear a large bun, choose the long khimar.';

export function sizeGuideReturnsCopy(city: string, days: number) {
  return `${city} collection: try on in person. Ireland delivery: keep tags on for the ${days}-day return window.`;
}

export function sizeHintForCategory(categorySlug?: string, returnDays = 14) {
  if (categorySlug === 'hijabs') {
    return 'One size. Chiffon 180 × 70 cm; satin square 90 cm. Instant jersey fits a 54–60 cm head.';
  }
  if (categorySlug === 'abayas' || categorySlug === 'jilbabs') {
    return 'Cut modest and slightly generous. Between sizes? Take the larger. Full measurements are in the size guide.';
  }
  if (categorySlug === 'dresses') {
    return 'Modest calf length with ease through the hip. Between sizes? Take the larger. Full measurements are in the size guide.';
  }
  return `One size. Try on in Dublin if you are unsure; keep tags on for ${returnDays}-day returns.`;
}
