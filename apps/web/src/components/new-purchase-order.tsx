'use client';

import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  PrimaryButton,
  SecondaryButton,
  Select,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';
import { formatUnits } from '@/lib/supply';
import { supplierCountryLabel } from '@motive-fashion/config';

type SupplierOption = { id: string; name: string; country: string; skuCount: number };

type SkuRow = {
  variantId: string;
  productId: string;
  sku: string;
  productTitle: string;
  size: string;
  color: string;
  onHand: number;
  inbound: number;
  moq: number;
  unitCostCents: number;
  suggestedQty: number;
  needsRestock: boolean;
};

type Board = { skus: SkuRow[] };
type ExistingPo = {
  id: string;
  status: string;
  notes: string | null;
  supplierId: string;
  lines: { variantId: string; quantity: number; unitCostCents: number }[];
};

function eurosToCents(value: string) {
  const n = Number(value.trim());
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.round(n * 100);
}

function restockQuantities(rows: SkuRow[]) {
  const next: Record<string, string> = {};
  const productQty = new Map<string, { variantId: string; qty: number; moq: number }>();
  for (const row of rows) {
    if (row.suggestedQty <= 0) continue;
    next[row.variantId] = String(row.suggestedQty);
    const acc = productQty.get(row.productId) ?? { variantId: row.variantId, qty: 0, moq: row.moq };
    acc.qty += row.suggestedQty;
    productQty.set(row.productId, acc);
  }
  for (const row of productQty.values()) {
    if (row.qty >= row.moq) continue;
    next[row.variantId] = String((Number.parseInt(next[row.variantId] ?? '0', 10) || 0) + (row.moq - row.qty));
  }
  return next;
}

export function NewPurchaseOrder({
  initialSupplierId = '',
  fromRestock = false,
  editId,
}: {
  initialSupplierId?: string;
  fromRestock?: boolean;
  editId?: string;
}) {
  const router = useRouter();
  const { data: suppliers, error, loading, reload } = useConsoleQuery<SupplierOption[]>(
    '/admin/procurement/suppliers',
    'Could not load suppliers',
  );
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [skus, setSkus] = useState<SkuRow[]>([]);
  const [skuError, setSkuError] = useState('');
  const [skuLoading, setSkuLoading] = useState(false);
  const [qty, setQty] = useState<Record<string, string>>({});
  const [cost, setCost] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState('');
  const [filter, setFilter] = useState(fromRestock && !editId ? 'restock' : 'all');
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const [editError, setEditError] = useState('');
  const filled = useRef(false);
  const prefill = useRef<ExistingPo['lines'] | null>(null);

  useEffect(() => {
    if (!editId) return;
    let cancelled = false;
    fetch(`${API}/admin/procurement/purchase-orders/${editId}`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as ExistingPo | null;
        if (cancelled) return;
        if (!res.ok) {
          setEditError(apiErrorMessage(payload, 'Could not load this purchase order.'));
          return;
        }
        if (payload?.status !== 'DRAFT') {
          setEditError('Only a draft can be edited.');
          return;
        }
        prefill.current = payload.lines;
        setSupplierId(payload.supplierId);
        setNotes(payload.notes ?? '');
        setFilter('all');
      })
      .catch(() => {
        if (!cancelled) setEditError('Could not load this purchase order.');
      });
    return () => {
      cancelled = true;
    };
  }, [editId]);

  useEffect(() => {
    if (!supplierId) {
      setSkus([]);
      setQty({});
      setCost({});
      filled.current = false;
      return;
    }
    let cancelled = false;
    setSkuLoading(true);
    setSkuError('');
    fetch(`${API}/admin/procurement/suppliers/${supplierId}`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json().catch(() => null)) as Board | null;
        if (cancelled) return;
        if (!res.ok) {
          setSkus([]);
          setSkuError(apiErrorMessage(payload, 'Could not load SKUs for this supplier.'));
          return;
        }
        const rows = payload?.skus ?? [];
        setSkus(rows);
        setSkuError('');
        const nextCost: Record<string, string> = {};
        for (const row of rows) nextCost[row.variantId] = (row.unitCostCents / 100).toFixed(2);
        if (prefill.current) {
          const nextQty: Record<string, string> = {};
          for (const line of prefill.current) {
            nextQty[line.variantId] = String(line.quantity);
            nextCost[line.variantId] = (line.unitCostCents / 100).toFixed(2);
          }
          setQty(nextQty);
          prefill.current = null;
          filled.current = true;
        } else if (fromRestock && !filled.current) {
          setQty(restockQuantities(rows));
          filled.current = true;
        } else if (!editId) {
          setQty({});
        }
        setCost(nextCost);
      })
      .catch(() => {
        if (!cancelled) {
          setSkus([]);
          setSkuError('Could not load SKUs for this supplier.');
        }
      })
      .finally(() => {
        if (!cancelled) setSkuLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [editId, fromRestock, supplierId]);

  const visible = useMemo(
    () => (filter === 'restock' ? skus.filter((row) => row.needsRestock || row.suggestedQty > 0) : skus),
    [filter, skus],
  );

  const lines = skus
    .map((row) => {
      const quantity = Number.parseInt(qty[row.variantId] ?? '', 10);
      if (!Number.isFinite(quantity) || quantity <= 0) return null;
      return {
        variantId: row.variantId,
        quantity,
        unitCostCents: eurosToCents(cost[row.variantId] ?? ''),
      };
    })
    .filter((line): line is { variantId: string; quantity: number; unitCostCents: number } => Boolean(line));
  const totalUnits = lines.reduce((sum, line) => sum + line.quantity, 0);

  function fillSuggested() {
    setQty(restockQuantities(skus));
    setFilter('restock');
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setFormError('');
    if (!supplierId) {
      setFormError('Pick a supplier.');
      return;
    }
    if (!lines.length) {
      setFormError('Enter a quantity on at least one SKU.');
      return;
    }
    setBusy(true);
    const path = editId ? `/admin/procurement/purchase-orders/${editId}` : '/admin/procurement/purchase-orders';
    const res = await fetch(`${API}${path}`, {
      method: editId ? 'PATCH' : 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...(editId ? {} : { supplierId }),
        notes: notes.trim() || undefined,
        lines,
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not save this purchase order.'));
      return;
    }
    router.push('/admin/procurement');
  }

  const options = (suppliers ?? []).map((row) => ({
    value: row.id,
    label: `${row.name} · ${supplierCountryLabel(row.country)}`,
  }));

  return (
    <div>
      <PageHeader
        title={editId ? 'Edit draft' : 'New purchase order'}
        description={
          editId
            ? 'Change quantities or factory cost on this draft. Cancelling is on the purchase-order list.'
            : 'Pick a mill, set quantities, and save a draft. Stock does not move until you mark it ordered, then receive it.'
        }
        actions={
          <Link href="/admin/procurement" className="rounded-lg border border-ink/15 px-3 py-1.5 text-sm no-underline hover:border-ink/40">
            All purchase orders
          </Link>
        }
      />
      <ConsoleSection loading={loading} error={error || editError} onRetry={reload}>
        <form onSubmit={(e) => void save(e)} className="space-y-6">
          {formError ? (
            <p className="text-sm text-red-700" role="alert">
              {formError}
            </p>
          ) : null}
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Supplier">
              <Select
                value={supplierId}
                onChange={(value) => {
                  filled.current = false;
                  setSupplierId(value);
                }}
                options={options}
                placeholder="Select a supplier"
                required
                sortLabels
                disabled={Boolean(editId)}
              />
            </Field>
            <Field label="Notes">
              <input
                className={fieldClass}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={500}
                placeholder="Optional — WhatsApp thread, colourway, etc."
              />
            </Field>
          </div>

          {supplierId ? (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <FilterTabs
                  ariaLabel="SKU filter"
                  current={filter}
                  onChange={setFilter}
                  items={[
                    { id: 'all', label: `All SKUs (${skus.length})` },
                    { id: 'restock', label: 'Needs buy' },
                  ]}
                />
                <SecondaryButton type="button" disabled={!skus.some((row) => row.suggestedQty > 0)} onClick={fillSuggested}>
                  Fill restock
                </SecondaryButton>
              </div>
              {skuError ? (
                <p className="text-sm text-red-700" role="alert">
                  {skuError}
                </p>
              ) : null}
              {skuLoading ? (
                <p className="text-sm text-ink/70">Loading SKUs…</p>
              ) : visible.length === 0 ? (
                <p className="text-sm text-ink/55">
                  {skus.length === 0
                    ? (
                      <>
                        This mill has no linked products yet.{' '}
                        <Link href={`/admin/suppliers/${supplierId}`}>Link products</Link>
                        {' '}and then raise the first order.
                      </>
                    )
                    : 'Nothing below reorder for this mill. Switch to All SKUs to order anyway.'}
                </p>
              ) : (
                <DataTable headers={['SKU', 'On hand', 'Inbound', 'MOQ', 'Cost', 'Qty']}>
                  {visible.map((row) => (
                    <tr key={row.variantId} className="hover:bg-ink/5">
                      <Td>
                        <span className="block">{row.productTitle}</span>
                        <span className="block font-mono text-xs text-ink/45">
                          {row.sku} · {row.size} / {row.color}
                        </span>
                        {row.needsRestock ? <span className="mt-1 block text-xs text-red-700">Below reorder</span> : null}
                      </Td>
                      <Td>{formatUnits(row.onHand)}</Td>
                      <Td muted>{formatUnits(row.inbound)}</Td>
                      <Td muted>{formatUnits(row.moq)}</Td>
                      <Td>
                        <input
                          className={`${fieldClass} max-w-[7rem]`}
                          inputMode="decimal"
                          min={0}
                          step="0.01"
                          type="number"
                          value={cost[row.variantId] ?? ''}
                          onChange={(e) => setCost((prev) => ({ ...prev, [row.variantId]: e.target.value }))}
                          aria-label={`Factory cost for ${row.sku}`}
                        />
                      </Td>
                      <Td>
                        <input
                          className={`${fieldClass} max-w-[7rem]`}
                          inputMode="numeric"
                          min={0}
                          type="number"
                          value={qty[row.variantId] ?? ''}
                          onChange={(e) => setQty((prev) => ({ ...prev, [row.variantId]: e.target.value }))}
                          aria-label={`Quantity for ${row.sku}`}
                        />
                        {row.suggestedQty > 0 ? (
                          <button
                            type="button"
                            className="mt-1 block text-xs text-accent hover:underline"
                            onClick={() => setQty((prev) => ({ ...prev, [row.variantId]: String(row.suggestedQty) }))}
                          >
                            Suggest {formatUnits(row.suggestedQty)}
                          </button>
                        ) : null}
                      </Td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </>
          ) : (
            <p className="text-sm text-ink/55">Choose a supplier to see their SKUs.</p>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <PrimaryButton type="submit" disabled={busy || !supplierId || Boolean(editError)}>
              {busy ? 'Saving…' : `${editId ? 'Save changes' : 'Save draft'}${totalUnits ? ` · ${formatUnits(totalUnits)} units` : ''}`}
            </PrimaryButton>
            <Link href="/admin/procurement" className="text-sm text-ink/55 no-underline hover:text-ink">
              Cancel
            </Link>
          </div>
        </form>
      </ConsoleSection>
    </div>
  );
}
