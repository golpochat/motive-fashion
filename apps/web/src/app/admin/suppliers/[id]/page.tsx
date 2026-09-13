'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { DataTable, FilterTabs, Td } from '@/components/dashboard-ui';
import { formatUnits, PACE_LABEL, PO_STATUS_LABEL } from '@/lib/supply';
import { SupplierRange, type SupplierLink } from '@/components/supplier-range';
import { supplierCountryLabel } from '@motive-fashion/config';

type Board = {
  supplier: {
    id: string;
    name: string;
    country: string;
    email: string | null;
    phone: string | null;
    notes: string | null;
    example: boolean;
  };
  totals: {
    draftUnits: number;
    orderedUnits: number;
    inTransitUnits: number;
    receivedUnits: number;
    onHand: number;
    sold30d: number;
    soldPrev30d: number;
    soldAll: number;
    fastSkuCount: number;
    restockCount: number;
  };
  purchaseOrders: {
    id: string;
    monthBucket: string;
    status: string;
    lines: { id: string; sku: string; quantity: number; receivedQty: number }[];
    shipments: { id: string; status: string; tracking: string | null }[];
  }[];
  skus: {
    variantId: string;
    sku: string;
    productTitle: string;
    size: string;
    color: string;
    onHand: number;
    inbound: number;
    sold30d: number;
    soldPrev30d: number;
    soldAll: number;
    pace: 'fast' | 'steady' | 'quiet';
    needsRestock: boolean;
  }[];
  links: SupplierLink[];
};

export default function AdminSupplierBoard() {
  const params = useParams<{ id: string }>();
  const { data, error, loading, reload } = useConsoleQuery<Board>(
    `/admin/procurement/suppliers/${params.id}`,
    'Could not load this supplier',
  );
  const [tab, setTab] = useState<string | null>(null);
  const [skuFilter, setSkuFilter] = useState('all');
  const currentTab = tab ?? (data && (data.links?.length ?? 0) === 0 ? 'range' : 'selling');

  useEffect(() => {
    setTab(null);
  }, [params.id]);

  const skus = useMemo(() => {
    const rows = data?.skus ?? [];
    if (skuFilter === 'fast') return rows.filter((row) => row.pace === 'fast');
    if (skuFilter === 'restock') return rows.filter((row) => row.needsRestock);
    return rows;
  }, [data, skuFilter]);

  return (
    <div>
      <PageHeader
        title={data?.supplier.name ?? 'Supplier'}
        description={
          data
            ? `${supplierCountryLabel(data.supplier.country)}${data.supplier.example ? ' · Example contact' : ''}. Ordered is with the factory; on the way is inbound; sold is paid tickets in the last 30 days.`
            : 'Buying, inbound, and sell-through for this mill.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/procurement/new?supplier=${params.id}`}
              className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm text-cream no-underline hover:bg-primary/90"
            >
              New purchase order
            </Link>
            <Link href="/admin/suppliers" className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm no-underline hover:border-ink/40">
              All suppliers
            </Link>
          </div>
        }
      />
      <ConsoleSection loading={loading} error={error} onRetry={reload}>
        {data ? (
          <>
            <p className="mb-4 text-sm text-ink/55">
              {data.supplier.email || data.supplier.phone || 'No contact on file'}
              {data.supplier.notes ? ` · ${data.supplier.notes}` : ''}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Ordered"
                value={formatUnits(data.totals.orderedUnits)}
                hint={data.totals.draftUnits ? `${formatUnits(data.totals.draftUnits)} still draft` : 'With the factory'}
              />
              <StatCard label="On the way" value={formatUnits(data.totals.inTransitUnits)} hint="In transit to Dublin" />
              <StatCard label="On hand" value={formatUnits(data.totals.onHand)} hint={`${formatUnits(data.totals.receivedUnits)} received on POs`} />
              <StatCard
                label="Sold (30d)"
                value={formatUnits(data.totals.sold30d)}
                hint={
                  data.totals.soldPrev30d
                    ? `${formatUnits(data.totals.soldPrev30d)} in the 30 days before`
                    : `${formatUnits(data.totals.soldAll)} all time`
                }
              />
            </div>
            {data.totals.fastSkuCount || data.totals.restockCount ? (
              <p className="mt-4 text-sm text-ink/55">
                {data.totals.fastSkuCount ? `${data.totals.fastSkuCount} SKU${data.totals.fastSkuCount === 1 ? '' : 's'} selling fast. ` : ''}
                {data.totals.restockCount ? `${data.totals.restockCount} below reorder point.` : ''}
              </p>
            ) : null}

            <div className="mt-8">
              <FilterTabs
                ariaLabel="Supplier board"
                current={currentTab}
                onChange={(id) => setTab(id)}
                items={[
                  { id: 'range', label: 'Range' },
                  { id: 'selling', label: 'Selling' },
                  { id: 'buying', label: 'Buying' },
                ]}
              />
            </div>

            {currentTab === 'range' ? (
              <SupplierRange supplierId={data.supplier.id} links={data.links} onChanged={reload} />
            ) : null}

            {currentTab === 'selling' ? (
              <div className="mt-6">
                <div className="mb-4">
                  <FilterTabs
                    ariaLabel="SKU filter"
                    current={skuFilter}
                    onChange={setSkuFilter}
                    items={[
                      { id: 'all', label: `All SKUs (${data.skus.length})` },
                      { id: 'fast', label: 'Selling fast' },
                      { id: 'restock', label: 'Needs buy' },
                    ]}
                  />
                </div>
                {skus.length === 0 ? (
                  <p className="text-sm text-ink/55">
                    {data.links.length === 0 ? (
                      <>
                        No styles linked yet.{' '}
                        <button type="button" className="text-accent hover:underline" onClick={() => setTab('range')}>
                          Link products
                        </button>{' '}
                        this mill makes, then raise a purchase order.
                      </>
                    ) : (
                      'No SKUs in this filter.'
                    )}
                  </p>
                ) : (
                  <DataTable headers={['SKU', 'On hand', 'Inbound', 'Sold 30d', 'Sold all', 'Pace']}>
                    {skus.map((row) => (
                      <tr key={row.variantId} className="hover:bg-ink/5">
                        <Td>
                          <span className="block">{row.productTitle}</span>
                          <span className="block font-mono text-xs text-ink/45">
                            {row.sku} · {row.size} / {row.color}
                          </span>
                        </Td>
                        <Td>{formatUnits(row.onHand)}</Td>
                        <Td muted>{formatUnits(row.inbound)}</Td>
                        <Td>{formatUnits(row.sold30d)}</Td>
                        <Td muted>{formatUnits(row.soldAll)}</Td>
                        <Td>
                          <span className={row.pace === 'fast' ? 'text-moss' : row.pace === 'quiet' ? 'text-ink/45' : ''}>
                            {PACE_LABEL[row.pace]}
                          </span>
                          {row.needsRestock ? <span className="mt-1 block text-xs text-red-700">Below reorder</span> : null}
                        </Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
              </div>
            ) : null}

            {currentTab === 'buying' ? (
              <div className="mt-6">
                {data.purchaseOrders.length === 0 ? (
                  <p className="text-sm text-ink/55">
                    {data.links.length === 0 ? (
                      <>
                        Link products under Range, then{' '}
                        <Link href={`/admin/procurement/new?supplier=${data.supplier.id}`}>raise a draft</Link>.
                      </>
                    ) : (
                      'No purchase orders for this supplier.'
                    )}
                  </p>
                ) : (
                  <DataTable headers={['Plan', 'Lines', 'Status', 'Tracking']}>
                    {data.purchaseOrders.map((po) => (
                      <tr key={po.id} className="hover:bg-ink/5">
                        <Td>
                          <Link href="/admin/procurement" className="no-underline hover:text-accent">
                            {po.monthBucket}
                          </Link>
                        </Td>
                        <Td muted>
                          {po.lines.map((line) => (
                            <span key={line.id} className="block text-xs">
                              {line.sku} · {line.receivedQty}/{line.quantity}
                            </span>
                          ))}
                        </Td>
                        <Td>{PO_STATUS_LABEL[po.status] ?? po.status}</Td>
                        <Td muted>{po.shipments.map((s) => s.tracking).filter(Boolean).join(', ') || '—'}</Td>
                      </tr>
                    ))}
                  </DataTable>
                )}
                <p className="mt-4 text-sm text-ink/55">
                  Raise a draft, then mark ordered, add tracking, and receive on{' '}
                  <Link href="/admin/procurement">Procurement</Link>.
                </p>
              </div>
            ) : null}
          </>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
