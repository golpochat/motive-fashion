import { describe, expect, it } from 'vitest';
import {
  ABAYA_JILBAB_CHART,
  CATALOG_SIZES,
  DRESS_CHART,
  GARMENT_LETTER_SIZES,
  HIJAB_SPECS,
  catalogSizeLabel,
  sizeHintForCategory,
} from '@motive-fashion/utils';

describe('size guide', () => {
  it('covers every catalog letter size and labels OS as one size', () => {
    expect(CATALOG_SIZES).toEqual(['OS', ...GARMENT_LETTER_SIZES]);
    expect(ABAYA_JILBAB_CHART.map((row) => row.size)).toEqual([...GARMENT_LETTER_SIZES]);
    expect(DRESS_CHART.map((row) => row.size)).toEqual([...GARMENT_LETTER_SIZES]);
    expect(catalogSizeLabel('OS')).toBe('One size');
    expect(catalogSizeLabel('M')).toBe('M');
  });

  it('keeps overlay pieces longer and roomier than dresses', () => {
    const overlayS = ABAYA_JILBAB_CHART.find((row) => row.size === 'S');
    const dressS = DRESS_CHART.find((row) => row.size === 'S');
    expect(overlayS?.bust).toBeGreaterThanOrEqual(100);
    expect(overlayS?.length).toBeGreaterThan(dressS?.length ?? 0);
    expect(dressS?.hip).toBeGreaterThan(dressS?.bust ?? 0);
  });

  it('matches the hijab SKUs and PDP hints', () => {
    expect(HIJAB_SPECS.map((row) => row.detail).join(' ')).toMatch(/180 × 70/);
    expect(HIJAB_SPECS.map((row) => row.detail).join(' ')).toMatch(/90 × 90/);
    expect(HIJAB_SPECS.map((row) => row.detail).join(' ')).toMatch(/54–60/);
    expect(sizeHintForCategory('hijabs')).toMatch(/180 × 70/);
    expect(sizeHintForCategory('dresses')).toMatch(/calf/);
    expect(sizeHintForCategory('niqabs', 14)).toMatch(/14-day/);
  });
});
