'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, EmptyState, PageHeader } from '@/components/page-header';
import { DataTable, Field, FilterTabs, IconButton, JobCard, Modal, PrimaryButton, RowActions, SecondaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';
import { useSession } from '@/components/session-provider';
import { hasPerm } from '@/lib/rbac';
import { scanMatchesVariant } from '@motive-fashion/utils';

type Level = {
  id: string;
  variantId: string;
  locationId: string;
  onHand: number;
  reserved: number;
  binCode: string | null;
  variant: { sku: string; barcode: string | null; product: { title: string } };
  location: { code: string };
};

type LocationRow = { id: string; code: string; name: string };
type LedgerModal = 'adjust' | 'transfer' | null;

function freeOf(row: Level) {
  return Math.max(0, row.onHand - row.reserved);
}

function BinField({
  row,
  canAdjust,
  onError,
  onSaved,
}: {
  row: Level;
  canAdjust: boolean;
  onError: (message: string) => void;
  onSaved: () => void;
}) {
  const [value, setValue] = useState(row.binCode ?? '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setValue(row.binCode ?? '');
  }, [row.binCode]);

  if (!canAdjust) {
    return <span className="font-mono text-xs">{row.binCode || '—'}</span>;
  }

  async function save() {
    const next = value.trim();
    if (next === (row.binCode ?? '')) return;
    setBusy(true);
    const res = await fetch(`${API}/stock/bin`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: row.variantId,
        locationId: row.locationId,
        binCode: next,
      }),
    });
    const payload = (await res.json().catch(() => ({}))) as { message?: string };
    setBusy(false);
    if (!res.ok) {
      onError(apiErrorMessage(payload, 'Could not save this bin.'));
      return;
    }
    onSaved();
  }

  return (
    <input
      className={`${fieldClass} font-mono text-xs`}
      value={value}
      disabled={busy}
      placeholder="WH-A-01-02"
      aria-label={`Bin for ${row.variant.sku}`}
      onChange={(e) => setValue(e.target.value)}
      onBlur={() => void save()}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
    />
  );
}

export function InventoryLedger({
  description = 'Scan a barcode or SKU. Set a bin when the room needs software locations.',
}: {
  description?: string;
}) {
  const { me } = useSession();
  const canAdjust = hasPerm(me, 'inventory.adjust');
  const scanRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Level[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [modal, setModal] = useState<LedgerModal>(null);
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
    setLoading(true);
    Promise.all([
      fetch(`${API}/admin/inventory`, { credentials: 'include' }),
      fetch(`${API}/admin/locations`, { credentials: 'include' }),
    ])
      .then(async ([inv, loc]) => {
        if (!inv.ok || !loc.ok) {
          setLoadError('Could not load inventory');
          return;
        }
        setLoadError('');
        setRows((await inv.json()) as Level[]);
        setLocations((await loc.json()) as LocationRow[]);
      })
      .catch(() => setLoadError('Could not load inventory'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromUrl = params.get('q') ?? params.get('sku') ?? '';
    if (fromUrl) setQuery(fromUrl);
  }, []);

  const variants = useMemo(() => Array.from(new Map(rows.map((row) => [row.variantId, row])).values()), [rows]);
  const low = rows.filter((row) => freeOf(row) <= 5).length;

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((row) => {
      if (locationId && row.locationId !== locationId) return false;
      if (!q) return true;
      return (
        row.variant.sku.toLowerCase().includes(q) ||
        (row.variant.barcode ?? '').toLowerCase().includes(q) ||
        (row.binCode ?? '').toLowerCase().includes(q) ||
        row.variant.product.title.toLowerCase().includes(q)
      );
    });
  }, [rows, query, locationId]);

  function applySku(sku: string) {
    const needle = sku.trim();
    if (!needle) return;
    const exact = rows.filter((row) =>
      scanMatchesVariant(needle, { sku: row.variant.sku, barcode: row.variant.barcode }),
    );
    const match = exact.length
      ? exact
      : rows.filter(
          (row) =>
            row.variant.sku.toLowerCase().includes(needle.toLowerCase()) ||
            (row.variant.barcode ?? '').toLowerCase().includes(needle.toLowerCase()),
        );
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
    setModal(null);
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
    setModal(null);
    reload();
  }

  function openAdjust(row?: Level) {
    setError('');
    setNotice('');
    if (row) setLevelKey(`${row.variantId}|${row.locationId}`);
    setModal('adjust');
  }

  function openTransfer(row?: Level) {
    setError('');
    setNotice('');
    if (row) {
      setVariantId(row.variantId);
      setFromLocationId(row.locationId);
    }
    setModal('transfer');
  }

  return (
    <div>
      <PageHeader
        title="Inventory"
        description={description}
        actions={
          canAdjust ? (
            <div className="flex flex-wrap gap-2">
              <SecondaryButton type="button" onClick={() => openAdjust()}>
                Adjust
              </SecondaryButton>
              <SecondaryButton type="button" onClick={() => openTransfer()}>
                Transfer
              </SecondaryButton>
            </div>
          ) : undefined
        }
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-moss">{notice}</p> : null}

      <ConsoleSection loading={loading} error={loadError} onRetry={reload}>
      <form onSubmit={onScan} className="mb-4">
        <input
          ref={scanRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setHighlighted('');
          }}
          className={fieldClass}
          placeholder="Search or scan barcode / SKU"
          autoFocus
          aria-label="Search or scan barcode or SKU"
        />
      </form>

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
        <DataTable
          headers={canAdjust ? ['SKU', 'Location', 'Bin', 'On hand', 'Reserved', 'Free', 'Action'] : ['SKU', 'Location', 'Bin', 'On hand', 'Reserved', 'Free']}
          cards={visible.map((row) => {
            const free = freeOf(row);
            return (
              <JobCard
                key={row.id}
                title={row.variant.sku}
                meta={`${row.location.code}${row.binCode ? ` · ${row.binCode}` : ''} · free ${free}`}
                actions={
                  canAdjust ? (
                    <RowActions>
                      <IconButton label="Adjust stock" icon="edit" onClick={() => openAdjust(row)} />
                      <IconButton label="Transfer stock" icon="truck" onClick={() => openTransfer(row)} />
                    </RowActions>
                  ) : undefined
                }
              >
                <p className="mt-2 text-sm">{row.variant.product.title}</p>
              </JobCard>
            );
          })}
        >
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
                <Td>
                  <BinField
                    row={row}
                    canAdjust={canAdjust}
                    onError={setError}
                    onSaved={() => {
                      setNotice('Bin saved.');
                      setError('');
                      reload();
                    }}
                  />
                </Td>
                <Td>{row.onHand}</Td>
                <Td>{row.reserved}</Td>
                <Td>
                  <span className={free <= 5 ? 'text-red-700' : ''}>{free}</span>
                </Td>
                {canAdjust ? (
                  <Td nowrap>
                    <RowActions>
                      <IconButton label="Adjust stock" icon="edit" onClick={() => openAdjust(row)} />
                      <IconButton label="Transfer stock" icon="truck" onClick={() => openTransfer(row)} />
                    </RowActions>
                  </Td>
                ) : null}
              </tr>
            );
          })}
        </DataTable>
      )}
      </ConsoleSection>

      {modal === 'adjust' && canAdjust ? (
        <Modal title="Adjust on-hand" onClose={() => setModal(null)}>
          <form onSubmit={onAdjust} className="space-y-3">
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
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">Apply</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setModal(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {modal === 'transfer' && canAdjust ? (
        <Modal title="Transfer stock" onClose={() => setModal(null)}>
          <form onSubmit={onTransfer} className="space-y-3">
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
            <div className="flex flex-wrap gap-2">
              <PrimaryButton type="submit">Move stock</PrimaryButton>
              <SecondaryButton type="button" onClick={() => setModal(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
