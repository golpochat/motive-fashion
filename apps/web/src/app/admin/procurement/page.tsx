'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, FilterTabs, PrimaryButton, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';
import { formatUnits } from '@/lib/supply';
import { supplierCountryLabel } from '@motive-fashion/config';

type Shipment = { id: string; status: string; tracking: string | null };
type PO = {
  id: string;
  monthBucket: string;
  status: string;
  notes: string | null;
  supplier: { id: string; country: string; name: string };
  lines: { id: string; quantity: number; receivedQty: number; variant: { sku: string } }[];
  shipments: Shipment[];
};
type Suggestion = {
  variantId: string;
  sku: string;
  title: string;
  suggestedQty: number;
  supplierId: string | null;
  supplierName: string | null;
};

export default function AdminProcurement() {
  const { data, error, loading, reload } = useConsoleQuery<PO[]>(
    '/admin/procurement/purchase-orders',
    'Could not load purchase orders',
  );
  const { data: suggestions } = useConsoleQuery<Suggestion[]>(
    '/admin/procurement/suggestions',
    'Could not load restock suggestions',
  );
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('ALL');
  const pos = data ?? [];
  const visible =
    tab === 'ALL' ? pos.filter((p) => p.status !== 'CANCELLED') : pos.filter((p) => p.status === tab);
  const restockBySupplier = useMemo(() => {
    const groups = new Map<string, { id: string; name: string; count: number; units: number }>();
    for (const row of suggestions ?? []) {
      if (!row.supplierId) continue;
      const current = groups.get(row.supplierId) ?? { id: row.supplierId, name: row.supplierName ?? 'Supplier', count: 0, units: 0 };
      current.count += 1;
      current.units += row.suggestedQty;
      groups.set(row.supplierId, current);
    }
    return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name, 'en-IE'));
  }, [suggestions]);

  async function post(path: string, body?: unknown, id?: string) {
    setActionError('');
    setBusyId(id ?? path);
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = await res.json().catch(() => null);
    setBusyId('');
    if (!res.ok) {
      setActionError(apiErrorMessage(payload, 'Could not update this purchase order.'));
      return;
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Raise a draft PO, then mark it ordered, add inbound tracking, and receive stock onto the warehouse."
        actions={
          <Link
            href="/admin/procurement/new"
            className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm text-cream no-underline hover:bg-primary/90"
          >
            New purchase order
          </Link>
        }
      />
      {actionError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      ) : null}
      {restockBySupplier.length ? (
        <div className="mb-6 rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-ink/55">Below reorder</p>
          <ul className="mt-3 space-y-2">
            {restockBySupplier.map((group) => (
              <li key={group.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span>
                  {group.name}
                  <span className="text-ink/45">
                    {' '}
                    · {formatUnits(group.count)} SKU{group.count === 1 ? '' : 's'} · {formatUnits(group.units)} suggested
                  </span>
                </span>
                <Link
                  href={`/admin/procurement/new?supplier=${group.id}&from=restock`}
                  className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm no-underline hover:border-ink/40"
                >
                  Raise draft
                </Link>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <div className="mb-6">
        <FilterTabs
          ariaLabel="Purchase order status"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Draft' },
            { id: 'ORDERED', label: 'Ordered' },
            { id: 'IN_TRANSIT', label: 'In transit' },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={tab === 'ALL' ? 'No purchase orders' : 'No purchase orders in this status'}
        emptyBody="Raise a draft with New purchase order, then mark it ordered when the mill confirms."
      >
        <DataTable headers={['Month', 'Supplier', 'Lines', 'Status', 'Next']}>
          {visible.map((p) => {
            const inbound = p.shipments.find((s) => s.status !== 'RECEIVED');
            return (
              <tr key={p.id} className="hover:bg-ink/5">
                <Td>{p.monthBucket}</Td>
                <Td>
                  <Link href={`/admin/suppliers/${p.supplier.id}`} className="no-underline hover:text-accent">
                    {p.supplier.name}
                  </Link>
                  <span className="mt-1 block text-xs text-ink/45">{supplierCountryLabel(p.supplier.country)}</span>
                </Td>
                <Td muted>
                  {p.lines.map((line) => (
                    <span key={line.id} className="block text-xs">
                      {line.variant.sku} · {line.receivedQty}/{line.quantity}
                    </span>
                  ))}
                </Td>
                <Td>{p.status.replaceAll('_', ' ')}</Td>
                <Td>
                  {p.status === 'DRAFT' ? (
                    <div className="flex min-w-[12rem] flex-col gap-2">
                      <SecondaryButton
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void post(`/admin/procurement/purchase-orders/${p.id}/order`, undefined, p.id)}
                      >
                        Mark ordered
                      </SecondaryButton>
                      <Link
                        href={`/admin/procurement/new?edit=${p.id}`}
                        className="rounded-lg border border-ink/15 px-3 py-2.5 text-center text-sm no-underline hover:border-ink/40"
                      >
                        Edit
                      </Link>
                      <SecondaryButton
                        type="button"
                        disabled={busyId === p.id}
                        onClick={() => void post(`/admin/procurement/purchase-orders/${p.id}/cancel`, undefined, p.id)}
                      >
                        Cancel draft
                      </SecondaryButton>
                    </div>
                  ) : null}
                  {p.status === 'ORDERED' || p.status === 'IN_TRANSIT' ? (
                    <div className="flex min-w-[14rem] flex-col gap-2">
                      {!inbound ? (
                        <>
                          <Field label="Tracking">
                            <input
                              className={fieldClass}
                              value={tracking[p.id] ?? ''}
                              onChange={(e) => setTracking((prev) => ({ ...prev, [p.id]: e.target.value }))}
                            />
                          </Field>
                          <PrimaryButton
                            type="button"
                            disabled={busyId === p.id}
                            onClick={() =>
                              void post(
                                '/admin/procurement/shipments',
                                { purchaseOrderId: p.id, tracking: tracking[p.id]?.trim() || undefined },
                                p.id,
                              )
                            }
                          >
                            Ship inbound
                          </PrimaryButton>
                        </>
                      ) : (
                        <SecondaryButton
                          type="button"
                          disabled={busyId === inbound.id}
                          onClick={() => void post(`/admin/procurement/shipments/${inbound.id}/receive`, undefined, inbound.id)}
                        >
                          Receive stock
                        </SecondaryButton>
                      )}
                    </div>
                  ) : null}
                  {p.status === 'RECEIVED' || p.status === 'PARTIALLY_RECEIVED' || p.status === 'CANCELLED' ? (
                    <span className="text-ink/45">—</span>
                  ) : null}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
