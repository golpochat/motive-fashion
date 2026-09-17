'use client';

import { BRAND } from '@motive-fashion/config';
import { Code128Mark, QrMark } from '@/components/barcode-marks';

export type LabelSku = {
  sku: string;
  size: string;
  color: string;
  title: string;
  slug: string;
  binCode?: string | null;
};

export function HangTag({
  item,
  productUrl,
  showQr,
}: {
  item: LabelSku;
  productUrl: string;
  showQr: boolean;
}) {
  return (
    <article className="label-card flex w-[50mm] break-inside-avoid flex-col gap-2 border border-ink/20 bg-white p-3 print:border-ink">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/55">{BRAND.name}</p>
      <p className="font-serif text-sm leading-tight">{item.title}</p>
      <p className="text-xs text-ink/70">
        {item.size} · {item.color}
      </p>
      <Code128Mark value={item.sku} label={`SKU ${item.sku}`} />
      <p className="break-all font-mono text-[9px] leading-tight">{item.sku}</p>
      {showQr ? (
        <div className="flex items-end justify-between gap-2">
          <p className="text-[9px] leading-snug text-ink/55">Scan for the product page</p>
          <QrMark value={productUrl} label={`QR ${item.title}`} />
        </div>
      ) : null}
    </article>
  );
}

export function BinCard({ item }: { item: LabelSku }) {
  return (
    <article className="label-card flex w-[70mm] break-inside-avoid flex-col gap-2 border border-ink/20 bg-white p-3 print:border-ink">
      <p className="text-[10px] uppercase tracking-[0.2em] text-ink/55">Bin</p>
      <p className="font-mono text-2xl font-medium tracking-wide">{item.binCode || 'WH-—'}</p>
      <p className="font-serif text-sm leading-tight">{item.title}</p>
      <p className="text-xs text-ink/70">
        {item.size} · {item.color}
      </p>
      <Code128Mark value={item.sku} label={`SKU ${item.sku}`} />
      <p className="break-all font-mono text-[9px] leading-tight">{item.sku}</p>
    </article>
  );
}
