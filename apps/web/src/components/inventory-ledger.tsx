'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/page-header';
import { DataTable, Field, FilterTabs, PrimaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';
import { useSession } from '@/components/session-provider';
import { hasPerm } from '@/lib/rbac';

type Level = {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  variant: { sku: string; product: { title: string } };
  location: { code: string };
};

type LocationRow = { id: string; code: string; name: string };
type TabId = 'stock' | 'adjust' | 'transfer';

function freeOf(row: Level) {
  return Math.max(0, row.onHand - row.reserved);
}

export function InventoryLedger({
  description = 'Scan a SKU to look it up. Available is on hand minus reserved.',
}: {
  description?: string;
}) {
  const { me } = useSession();
  const canAdjust = hasPerm(me, 'inventory.adjust');
  const scanRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Level[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [tab, setTab] = useState<TabId>('stock');
  const [query, setQuery] = useState('');
  const [locationId, setLocationId] = useState('');
  const [highlighted, setHighlighted] = useState('');
  const [levelKey, setLevelKey] = useState('');
  const [delta, setDelta] = useState('');
  const [reason, setReason] = useState('');
  const [variantId, setVariantId] = useState('');
  const [fromLocationId, setFromLocationId] = useState('');
  const [toLocationId, setToLocationId] = useState('');
  const [quantity, setQuantity] = useState('1');

  const reload = useCallback(() => {
    fetch(`${API}/admin/inventory`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
    fetch(`${API}/admin/locations`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setLocations);
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const variants = useMemo(() => Array.from(new Map(rows.map((row) => [row.variantId, row])).values()), [rows]);
  const low = rows.filter((row) => freeOf(row) <= 5).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (locationId && row.locationId !== locationId) return false;
      if (!q) return true;
      return row.variant.sku.toLowerCase().includes(q) || row.variant.product.title.toLowerCase().includes(q);
    });
  }, [rows, query, locationId]);

  function applySku(sku: string) {
    const needle = sku.trim();
    if (!needle) return;
    const exact = rows.filter((row) => row.variant.sku.toLowerCase() === needle.toLowerCase());
    const match = exact.length ? exact : rows.filter((row) => row.variant.sku.toLowerCase().includes(needle.toLowerCase()));
    if (!match.length) {
      setError(`No ledger row for ${needle}.`);
      setHighlighted('');
      return;
    }
    const skuCode = match[0]?.variant.sku ?? needle;
    const first = match[0];
    if (!first) return;
    setError('');
    setQuery(skuCode);
    setHighlighted(skuCode);
    setLevelKey(`${first.variantId}|${first.locationId}`);
    setVariantId(first.variantId);
    if (match.length === 1) setLocationId(first.locationId);
    queueMicrotask(() => scanRef.current?.focus());
  }

  function onScan(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    applySku(query);
  }

  async function onAdjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const [nextVariant, nextLocation] = levelKey.split('|');
    if (!nextVariant || !nextLocation) {
      setError('Scan or select a SKU at a location.');
      return;
    }
    const res = await fetch(`${API}/stock/adjust`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: nextVariant,
        locationId: nextLocation,
        delta: Number(delta),
        reason,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Adjust failed. Check free stock and reason.'));
      return;
    }
    setNotice('On-hand updated.');
    setDelta('');
    setReason('');
    reload();
  }

  async function onTransfer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const res = await fetch(`${API}/stock/transfer`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        fromLocationId,
        toLocationId,
        quantity: Number(quantity),
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Transfer failed. Locations must differ and free stock must cover the quantity.'));
      return;
    }
    setNotice('Stock moved.');
    setQuantity('1');
    reload();
  }

  const tabs = [
    { id: 'stock', label: `Stock (${rows.length})` },
    ...(canAdjust
      ? [
          { id: 'adjust', label: 'Adjust' },
          { id: 'transfer', label: 'Transfer' },
        ]
      : []),
  ];

  return (
    <div>
      <PageHeader title="Inventory" description={description} />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-moss">{notice}</p> : null}

      <form onSubmit={onScan} className="mb-4">
        <input
          ref={scanRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted('');
          }}
          className={fieldClass}
          placeholder="Search or scan SKU"
          autoFocus
          aria-label="Search or scan SKU"
        />
      </form>

      <div className="mb-6">
        <FilterTabs
          ariaLabel="Inventory"
          items={tabs}
          current={tab}
          onChange={(id) => {
            setTab(id as TabId);
            setError('');
            setNotice('');
            queueMicrotask(() => scanRef.current?.focus());
          }}
        />
      </div>

      {tab === 'stock' ? (
        <div>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <FilterTabs
              ariaLabel="Location"
              items={[
                { id: '', label: 'All locations' },
                ...locations.map((location) => ({ id: location.id, label: location.code })),
              ]}
              current={locationId}
              onChange={setLocationId}
            />
            {low ? <p className="text-xs text-ink/55">{low} row{low === 1 ? '' : 's'} with free ≤ 5</p> : null}
          </div>
          {visible.length === 0 ? (
            <EmptyState title="No rows" body="Scan a SKU or clear the search." />
          ) : (
            <DataTable headers={['SKU', 'Location', 'On hand', 'Reserved', 'Free']}>
              {visible.map((row) => {
                const free = freeOf(row);
                const active = highlighted.toLowerCase() === row.variant.sku.toLowerCase();
                return (
                  <tr
                    key={row.id}
                    className={`hover:bg-ink/[0.02] ${active ? 'bg-accent/10' : ''} ${free <= 5 ? 'text-ink' : ''}`}
                  >
                    <Td>
                      <button
                        type="button"
                        className="text-left"
                        onClick={() => applySku(row.variant.sku)}
                      >
                        <span className="block font-medium">{row.variant.sku}</span>
                        <span className="text-ink/55">{row.variant.product.title}</span>
                      </button>
                    </Td>
                    <Td muted>{row.location.code}</Td>
                    <Td>{row.onHand}</Td>
                    <Td>{row.reserved}</Td>
                    <Td>
                      <span className={free <= 5 ? 'text-red-700' : ''}>{free}</span>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>
          )}
        </div>
      ) : null}

      {tab === 'adjust' && canAdjust ? (
        <form onSubmit={onAdjust} className="max-w-lg space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
          <Field label="SKU at location">
            <Select
              name="level"
              value={levelKey}
              onChange={setLevelKey}
              required
              className={fieldClass}
              placeholder="Scan or select"
              options={rows.map((row) => ({
                value: `${row.variantId}|${row.locationId}`,
                label: `${row.variant.sku} · ${row.location.code}`,
              }))}
            />
          </Field>
          <Field label="Delta">
            <input
              type="number"
              required
              placeholder="e.g. -2 or 5"
              className={fieldClass}
              value={delta}
              onChange={(e) => setDelta(e.target.value)}
            />
          </Field>
          <Field label="Reason">
            <input
              required
              minLength={3}
              className={fieldClass}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit">Apply</PrimaryButton>
        </form>
      ) : null}

      {tab === 'transfer' && canAdjust ? (
        <form onSubmit={onTransfer} className="max-w-lg space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
          <Field label="SKU">
            <Select
              name="variantId"
              value={variantId}
              onChange={setVariantId}
              required
              className={fieldClass}
              placeholder="Scan or select"
              options={variants.map((row) => ({
                value: row.variantId,
                label: `${row.variant.sku} · ${row.variant.product.title}`,
              }))}
            />
          </Field>
          <Field label="From">
            <Select
              name="fromLocationId"
              value={fromLocationId}
              onChange={setFromLocationId}
              required
              className={fieldClass}
              placeholder="Select"
              options={locations.map((location) => ({ value: location.id, label: location.code }))}
            />
          </Field>
          <Field label="To">
            <Select
              name="toLocationId"
              value={toLocationId}
              onChange={setToLocationId}
              required
              className={fieldClass}
              placeholder="Select"
              options={locations.map((location) => ({ value: location.id, label: location.code }))}
            />
          </Field>
          <Field label="Quantity">
            <input
              type="number"
              min={1}
              required
              className={fieldClass}
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </Field>
          <PrimaryButton type="submit">Move stock</PrimaryButton>
        </form>
      ) : null}
    </div>
  );
}
