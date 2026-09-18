import { describe, expect, it } from 'vitest';
import {
  cartesianStyleRows,
  defaultProductDescription,
  styleDefaultsForCategory,
  variantSku,
} from '@motive-fashion/utils';

describe('variantSku', () => {
  it('matches the warehouse seed pattern', () => {
    expect(variantSku('everyday-chiffon-hijab', 'OS', 'Black')).toBe('MF-EVERYDAY-CHIFFON-HIJAB-OS-BLACK');
    expect(variantSku('luxury-silk-abaya', 'M', 'Deep emerald')).toBe('MF-LUXURY-SILK-ABAYA-M-DEEP-EMERALD');
  });

  it('stays within 40 characters when the title is long', () => {
    const sku = variantSku('premium-crepe-abaya-with-belt-and-pockets', 'XL', 'Deep emerald');
    expect(sku.length).toBeLessThanOrEqual(40);
    expect(sku.startsWith('MF-')).toBe(true);
    expect(sku.endsWith('-XL-DEEP-EMERALD')).toBe(true);
  });
});

describe('style defaults', () => {
  it('preselects OS and Black for hijabs', () => {
    expect(styleDefaultsForCategory('hijabs').sizes).toEqual(['OS']);
    expect(styleDefaultsForCategory('hijabs').colors).toEqual(['Black']);
  });

  it('preselects a size run for abayas and jilbabs', () => {
    expect(styleDefaultsForCategory('abayas').sizes).toEqual(['S', 'M', 'L']);
    expect(styleDefaultsForCategory('jilbabs').prayerReady).toBe(true);
  });

  it('builds a size × colour matrix', () => {
    expect(cartesianStyleRows(['S', 'M'], ['Black', 'Taupe'])).toHaveLength(4);
  });

  it('fills a description so the merchant can skip typing one', () => {
    expect(defaultProductDescription('French jilbab', 'Jilbabs')).toBe('French jilbab for the Dublin shop.');
  });
});
