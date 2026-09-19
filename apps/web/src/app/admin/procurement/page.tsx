'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  IconButton,
  JobCard,
  Modal,
  PrimaryButton,
  RowActions,
  SecondaryButton,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';
import { formatUnits } from '@/lib/supply';
import { supplierCountryLabel } from '@motive-fashion/config';

type Shipment = { id: string; status: string; tracking: string | null };
type PO = {
  id: string;
  monthBucket: string;
  status: string;
  notes: string | null;
  supplier: { id: string; country: string; name: string; email: string | null };
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
type CalendarRow = { monthBucket: string; status: string; _count: number };

function millMailto(po: PO) {
  if (!po.supplier.email) return null;
  const lines = po.lines.map((line) => `${line.variant.sku} × ${line.quantity}`).join('\n');
  const body = `Hello,\n\nPlease confirm the following order for Motive Fashion, Dublin:\n\n${lines}\n\nThank you.`;
  return `mailto:${po.supplier.email}?subject=${encodeURIComponent(`Purchase order ${po.monthBucket} — Motive Fashion`)}&body=${encodeURIComponent(body)}`;
}

function inboundOf(po: PO) {
  return po.shipments.find((s) => s.status !== 'RECEIVED');
}

export default function AdminProcurement() {
  const { data, error, loading, reload } = useConsoleQuery<PO[]>(
    '/admin/procurement/purchase-orders',
    'Could not load purchase orders',
  );
  const { data: suggestions } = useConsoleQuery<Suggestion[]>(
    '/admin/procurement/suggestions',
    'Could not load restock suggestions',
  );
  const { data: calendar } = useConsoleQuery<CalendarRow[]>(
    '/admin/procurement/calendar',
    'Could not load the procurement calendar',
  );
  const [busyId, setBusyId] = useState('');
  const [actionError, setActionError] = useState('');
  const [tracking, setTracking] = useState<Record<string, string>>({});
  const [tab, setTab] = useState('ALL');
  const [query, setQuery] = useState('');
  const [receiving, setReceiving] = useState<PO | null>(null);
  const [recvQty, setRecvQty] = useState<Record<string, string>>({});
  const pos = data ?? [];
  const months = useMemo(() => {
    const map = new Map<string, number>();
    for (const row of calendar ?? []) {
      map.set(row.monthBucket, (map.get(row.monthBucket) ?? 0) + row._count);
    }
    return [...map.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [calendar]);
  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return pos.filter((p) => {
      if (tab === 'ALL' ? p.status === 'CANCELLED' : p.status !== tab) return false;
      if (!q) return true;
      return (
        p.supplier.name.toLowerCase().includes(q) ||
        p.monthBucket.includes(q) ||
        p.lines.some((line) => line.variant.sku.toLowerCase().includes(q))
      );
    });
  }, [pos, query, tab]);
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

  async function exportCsv() {
    const res = await fetch(`${API}/admin/procurement/purchase-orders/export`, { credentials: 'include' });
    if (!res.ok) {
      setActionError('Could not export purchase orders.');
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'purchase-orders.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

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
      return false;
    }
    reload();
    return true;
  }

  function openReceive(po: PO) {
    const qty: Record<string, string> = {};
    for (const line of po.lines) qty[line.id] = String(Math.max(0, line.quantity - line.receivedQty));
    setRecvQty(qty);
    setReceiving(po);
  }

  async function submitReceive() {
    if (!receiving) return;
    const inbound = inboundOf(receiving);
    if (!inbound) return;
    const lines = receiving.lines
      .map((line) => ({ lineId: line.id, quantity: Math.floor(Number(recvQty[line.id] || 0)) }))
      .filter((row) => row.quantity > 0);
    if (!lines.length) {
      setActionError('Enter at least one unit to receive.');
      return;
    }
    const ok = await post(`/admin/procurement/shipments/${inbound.id}/receive`, { lines }, inbound.id);
    if (ok) setReceiving(null);
  }

  function poActions(p: PO) {
    const inbound = inboundOf(p);
    const mail = millMailto(p);
    return (
      <>
        {mail ? <IconButton label="Email mill" icon="mail" href={mail} /> : null}
        {p.status === 'DRAFT' ? (
          <RowActions>
            <IconButton
              label="Mark ordered"
              icon="check"
              tone="success"
              disabled={busyId === p.id}
              onClick={() => void post(`/admin/procurement/purchase-orders/${p.id}/order`, undefined, p.id)}
            />
            <IconButton label="Edit purchase order" icon="edit" href={`/admin/procurement/new?edit=${p.id}`} />
            <IconButton
              label="Cancel draft"
              icon="trash"
              tone="danger"
              disabled={busyId === p.id}
              onClick={() => void post(`/admin/procurement/purchase-orders/${p.id}/cancel`, undefined, p.id)}
            />
          </RowActions>
        ) : null}
        {p.status === 'ORDERED' || p.status === 'IN_TRANSIT' || p.status === 'PARTIALLY_RECEIVED' ? (
          <div className="flex min-w-[14rem] flex-col items-end gap-2">
            {!inbound ? (
              <>
                <Field label="Tracking">
                  <input
                    className={fieldClass}
                    value={tracking[p.id] ?? ''}
                    onChange={(e) => setTracking((prev) => ({ ...prev, [p.id]: e.target.value }))}
                  />
                </Field>
                <IconButton
                  label="Ship inbound"
                  icon="truck"
                  disabled={busyId === p.id}
                  onClick={() =>
                    void post(
                      '/admin/procurement/shipments',
                      { purchaseOrderId: p.id, tracking: tracking[p.id]?.trim() || undefined },
                      p.id,
                    )
                  }
                />
              </>
            ) : (
              <IconButton
                label="Receive stock"
                icon="pack"
                disabled={busyId === inbound.id}
                onClick={() => openReceive(p)}
              />
            )}
          </div>
        ) : null}
        {p.status === 'RECEIVED' || p.status === 'CANCELLED' ? mail ? null : <span className="text-ink/45">—</span> : null}
      </>
    );
  }

  return (
    <div>
      <PageHeader
        title="Procurement"
        description="Raise a draft PO, then mark it ordered, add inbound tracking, and receive stock onto the warehouse."
        actions={
          <>
            <SecondaryButton type="button" onClick={() => void exportCsv()}>
              Export CSV
            </SecondaryButton>
            <Link
              href="/admin/procurement/new"
              className="min-h-11 rounded-lg bg-primary px-4 py-2.5 text-sm text-cream no-underline hover:bg-primary/90"
            >
              New purchase order
            </Link>
          </>
        }
      />
      {actionError ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {actionError}
        </p>
      ) : null}
      {months.length ? (
        <div className="mb-6 rounded-2xl border border-ink/10 bg-white p-5">
          <p className="text-xs uppercase tracking-wider text-ink/55">By month</p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {months.map(([month, count]) => (
              <li key={month}>
                <button
                  type="button"
                  className={`min-h-11 rounded-lg border px-3 py-1.5 text-sm ${query === month ? 'border-accent bg-accent/5' : 'border-ink/15 hover:border-ink/40'}`}
                  onClick={() => setQuery((current) => (current === month ? '' : month))}
                >
                  {month} · {formatUnits(count)}
                </button>
              </li>
            ))}
          </ul>
        </div>
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
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Purchase order status"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'ALL', label: 'All' },
            { id: 'DRAFT', label: 'Draft' },
            { id: 'ORDERED', label: 'Ordered' },
            { id: 'IN_TRANSIT', label: 'In transit' },
            { id: 'PARTIALLY_RECEIVED', label: 'Partial' },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'CANCELLED', label: 'Cancelled' },
          ]}
        />
      </div>
      <div className="mb-6 max-w-sm">
        <Field label="Search">
          <input
            className={fieldClass}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Supplier, SKU, or month"
          />
        </Field>
      </div>
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={tab === 'ALL' ? 'No purchase orders' : 'No purchase orders in this status'}
        emptyBody="Raise a draft with New purchase order, then mark it ordered when the mill confirms."
      >
        <DataTable
          headers={['Month', 'Supplier', 'Lines', 'Status', 'Action']}
          cards={visible.map((p) => (
            <JobCard
              key={p.id}
              title={p.supplier.name}
              meta={`${p.monthBucket} · ${p.status.replaceAll('_', ' ')} · ${supplierCountryLabel(p.supplier.country)}`}
              actions={poActions(p)}
            >
              <p className="mt-2 text-xs text-ink/55">
                {p.lines.map((line) => `${line.variant.sku} ${line.receivedQty}/${line.quantity}`).join(' · ')}
              </p>
            </JobCard>
          ))}
        >
          {visible.map((p) => (
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
              <Td nowrap>{poActions(p)}</Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
      {receiving ? (
        <Modal title="Receive stock" onClose={() => setReceiving(null)}>
          <p className="mb-3 text-sm text-ink/70">
            Enter units that arrived. Leave a line at 0 to keep it open. Remaining lines stay on this inbound.
          </p>
          <div className="space-y-3">
            {receiving.lines.map((line) => {
              const open = Math.max(0, line.quantity - line.receivedQty);
              return (
                <Field key={line.id} label={`${line.variant.sku} · open ${open}`}>
                  <input
                    className={fieldClass}
                    inputMode="numeric"
                    value={recvQty[line.id] ?? '0'}
                    onChange={(e) => setRecvQty((prev) => ({ ...prev, [line.id]: e.target.value }))}
                  />
                </Field>
              );
            })}
          </div>
          <div className="mt-4 flex gap-2">
            <PrimaryButton type="button" disabled={busyId === inboundOf(receiving)?.id} onClick={() => void submitReceive()}>
              Receive
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setReceiving(null)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
