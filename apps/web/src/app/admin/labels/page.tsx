'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { PrimaryButton, Select, Toggle } from '@/components/dashboard-ui';
import { BinCard, HangTag, type LabelSku } from '@/components/sku-labels';
import { absoluteUrl } from '@/lib/share';

type Variant = {
  id: string;
  sku: string;
  barcode?: string | null;
  size: string;
  color: string;
};
type Product = {
  id: string;
  title: string;
  slug: string;
  variants: Variant[];
};
type Level = {
  binCode?: string | null;
  variant: { sku: string };
  location: { code: string };
};

export default function AdminLabelsPage() {
  const { data, error, loading, reload } = useConsoleQuery<Product[]>(
    '/admin/products',
    'Could not load products',
  );
  const inventory = useConsoleQuery<Level[]>('/admin/inventory', 'Could not load bins');
  const products = data ?? [];
  const [productId, setProductId] = useState('');
  const [showQr, setShowQr] = useState(true);
  const [kind, setKind] = useState<'hang' | 'bin'>('hang');

  useEffect(() => {
    const fromQuery = new URLSearchParams(window.location.search).get('product') ?? '';
    if (fromQuery) setProductId(fromQuery);
  }, []);

  const product = useMemo(() => {
    if (productId) return products.find((row) => row.id === productId) ?? products[0] ?? null;
    return products[0] ?? null;
  }, [products, productId]);

  const bins = useMemo(() => {
    const map = new Map<string, string>();
    for (const row of inventory.data ?? []) {
      if (row.location.code !== 'warehouse' || !row.binCode) continue;
      map.set(row.variant.sku, row.binCode);
    }
    return map;
  }, [inventory.data]);

  const items: LabelSku[] = (product?.variants ?? []).map((variant) => ({
    sku: variant.sku,
    size: variant.size,
    color: variant.color,
    title: product?.title ?? '',
    slug: product?.slug ?? '',
    binCode: bins.get(variant.sku) ?? null,
  }));

  return (
    <div>
      <div className="print:hidden">
        <PageHeader
          title="Labels"
          description="Print a Code 128 of the SKU on hang tags and bin cards. The optional QR is for the product page, not the warehouse."
          actions={
            <PrimaryButton type="button" onClick={() => window.print()}>
              Print
            </PrimaryButton>
          }
        />
        <ConsoleSection loading={loading} error={error} onRetry={reload}>
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <label className="min-w-[16rem] flex-1 text-sm">
              <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Product</span>
              <Select
                value={product?.id ?? ''}
                onChange={setProductId}
                placeholder="Select a product"
                options={products.map((row) => ({
                  value: row.id,
                  label: `${row.title} (${row.variants.length} SKU${row.variants.length === 1 ? '' : 's'})`,
                }))}
              />
            </label>
            <Select
              value={kind}
              onChange={(value) => setKind(value as 'hang' | 'bin')}
              options={[
                { value: 'hang', label: 'Hang tags' },
                { value: 'bin', label: 'Bin cards' },
              ]}
            />
            {kind === 'hang' ? (
              <Toggle
                checked={showQr}
                onChange={setShowQr}
                label="Product QR"
              />
            ) : null}
            <Link href="/admin/products" className="text-sm">
              Back to products
            </Link>
          </div>
        </ConsoleSection>
      </div>
      {product && items.length ? (
        <div className="flex flex-wrap gap-4">
          {items.map((item) =>
            kind === 'hang' ? (
              <HangTag
                key={item.sku}
                item={item}
                productUrl={absoluteUrl(`/product/${item.slug}`)}
                showQr={showQr}
              />
            ) : (
              <BinCard key={item.sku} item={item} />
            ),
          )}
        </div>
      ) : !loading ? (
        <p className="text-sm text-ink/55 print:hidden">Add a SKU to this product before printing labels.</p>
      ) : null}
    </div>
  );
}
