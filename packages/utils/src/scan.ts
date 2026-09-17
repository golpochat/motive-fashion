export type ScanVariant = { sku: string; barcode?: string | null };

export function scanNeedle(value: string) {
  return value.trim().toLowerCase();
}

export function scanMatchesVariant(scan: string, variant: ScanVariant) {
  const needle = scanNeedle(scan);
  if (!needle) return false;
  if (variant.sku.toLowerCase() === needle) return true;
  return Boolean(variant.barcode && variant.barcode.toLowerCase() === needle);
}

export type PackScanLine = ScanVariant & {
  needed: number;
  scanned: number;
};

export function applyPackScan(lines: PackScanLine[], scan: string) {
  const index = lines.findIndex((line) => scanMatchesVariant(scan, line));
  if (index < 0) {
    return { lines, ok: false as const, message: `${scan.trim() || 'That scan'} is not on this order.` };
  }
  const line = lines[index]!;
  if (line.scanned >= line.needed) {
    return { lines, ok: false as const, message: `${line.sku} is already confirmed.` };
  }
  const next = lines.map((row, i) => (i === index ? { ...row, scanned: row.scanned + 1 } : row));
  return {
    lines: next,
    ok: true as const,
    message: `${line.sku} ${line.scanned + 1}/${line.needed}`,
  };
}

export function packScanComplete(lines: PackScanLine[]) {
  return lines.length > 0 && lines.every((line) => line.scanned >= line.needed);
}

export function normalizeBinCode(value: string | null | undefined) {
  const trimmed = (value ?? '').trim().toUpperCase().replace(/\s+/g, '-');
  return trimmed || null;
}
