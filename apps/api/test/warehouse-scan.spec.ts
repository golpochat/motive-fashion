import { describe, expect, it } from 'vitest';
import {
  applyPackScan,
  code128Checksum,
  encodeCode128Modules,
  normalizeBinCode,
  packScanComplete,
  qrModules,
  qrVersionFor,
  scanMatchesVariant,
} from '@motive-fashion/utils';

describe('scan lookup', () => {
  const variant = { sku: 'MF-LUXURY-SILK-ABAYA-M-DEEP-EMERALD', barcode: '5391234567890' };

  it('matches SKU or barcode, ignoring case and padding', () => {
    expect(scanMatchesVariant('MF-LUXURY-SILK-ABAYA-M-DEEP-EMERALD', variant)).toBe(true);
    expect(scanMatchesVariant('  mf-luxury-silk-abaya-m-deep-emerald ', variant)).toBe(true);
    expect(scanMatchesVariant('5391234567890', variant)).toBe(true);
    expect(scanMatchesVariant('MF-OTHER', variant)).toBe(false);
  });
});

describe('Code 128 of SKU', () => {
  it('checksums Code 128B and includes quiet zones', () => {
    expect(code128Checksum('ABC')).toBe(1);
    const modules = encodeCode128Modules('MF-LUXURY-SILK-ABAYA-M-DEEP-EMERALD');
    expect(modules.slice(0, 10).every((bit) => !bit)).toBe(true);
    expect(modules.slice(-10).every((bit) => !bit)).toBe(true);
    expect(modules.some((bit) => bit)).toBe(true);
  });
});

describe('product QR', () => {
  it('places finder patterns on a hang-tag sized matrix', () => {
    const url = 'https://motivefashion.com/product/luxury-silk-abaya';
    expect(qrVersionFor(url)).toBeGreaterThanOrEqual(1);
    const grid = qrModules(url);
    expect(grid.length).toBe(grid[0]?.length);
    expect(grid.length).toBeGreaterThanOrEqual(21);
    const finder = [
      [1, 1, 1, 1, 1, 1, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 1, 1, 1, 0, 1],
      [1, 0, 0, 0, 0, 0, 1],
      [1, 1, 1, 1, 1, 1, 1],
    ];
    for (let r = 0; r < 7; r += 1) {
      for (let c = 0; c < 7; c += 1) {
        expect(Number(grid[r]![c])).toBe(finder[r]![c]);
      }
    }
  });
});

describe('pack scan confirm', () => {
  it('counts each SKU up to the ordered qty and rejects extras', () => {
    let lines = [
      { sku: 'MF-NIDA-M-BLACK', barcode: 'MF-NIDA-M-BLACK', needed: 2, scanned: 0 },
      { sku: 'MF-HIJAB-OS-BLACK', barcode: null, needed: 1, scanned: 0 },
    ];
    expect(packScanComplete(lines)).toBe(false);
    const first = applyPackScan(lines, 'MF-NIDA-M-BLACK');
    expect(first.ok).toBe(true);
    lines = first.lines;
    const second = applyPackScan(lines, 'mf-nida-m-black');
    expect(second.ok).toBe(true);
    lines = second.lines;
    const extra = applyPackScan(lines, 'MF-NIDA-M-BLACK');
    expect(extra.ok).toBe(false);
    const other = applyPackScan(lines, 'MF-HIJAB-OS-BLACK');
    expect(other.ok).toBe(true);
    expect(packScanComplete(other.lines)).toBe(true);
    const unknown = applyPackScan(other.lines, 'MF-WRONG');
    expect(unknown.ok).toBe(false);
  });
});

describe('bin codes', () => {
  it('normalises shelf codes and clears blanks', () => {
    expect(normalizeBinCode(' wh-a-01-02 ')).toBe('WH-A-01-02');
    expect(normalizeBinCode('')).toBeNull();
  });
});
