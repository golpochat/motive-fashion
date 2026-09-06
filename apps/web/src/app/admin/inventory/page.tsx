'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Field, Panel, PrimaryButton, Td, fieldClass, Select } from '@/components/dashboard-ui';

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

export default function AdminInventory() {
  const [rows, setRows] = useState<Level[]>([]);
  const [locations, setLocations] = useState<LocationRow[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

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

  async function onAdjust(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget);
    const [variantId, locationId] = String(form.get('level')).split('|');
    const res = await fetch(`${API}/stock/adjust`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId,
        locationId,
        delta: Number(form.get('delta')),
        reason: String(form.get('reason')),
      }),
    });
    if (!res.ok) {
      setError('Adjust failed. Check free stock and reason.');
      return;
    }
    setNotice('On-hand updated.');
    e.currentTarget.reset();
    reload();
  }

  async function onTransfer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/stock/transfer`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        variantId: String(form.get('variantId')),
        fromLocationId: String(form.get('fromLocationId')),
        toLocationId: String(form.get('toLocationId')),
        quantity: Number(form.get('quantity')),
      }),
    });
    if (!res.ok) {
      setError('Transfer failed. Locations must differ and free stock must cover the quantity.');
      return;
    }
    setNotice('Stock moved.');
    e.currentTarget.reset();
    reload();
  }

  const variants = Array.from(new Map(rows.map((r) => [r.variantId, r])).values());

  return (
    <div>
      <PageHeader
        title="Inventory"
        description="Available equals on hand minus reserved. Adjustments and transfers share this ledger."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {notice ? <p className="mb-4 text-sm text-moss">{notice}</p> : null}

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Adjust on-hand">
          <form onSubmit={onAdjust} className="space-y-3">
            <Field label="SKU at location">
              <Select
                name="level"
                required
                className={fieldClass}
                placeholder="Select"
                options={rows.map((r) => ({
                  value: `${r.variantId}|${r.locationId}`,
                  label: `${r.variant.sku} · ${r.location.code}`,
                }))}
              />
            </Field>
            <Field label="Delta">
              <input name="delta" type="number" required placeholder="e.g. -2 or 5" className={fieldClass} />
            </Field>
            <Field label="Reason">
              <input name="reason" required minLength={3} className={fieldClass} />
            </Field>
            <PrimaryButton type="submit">Apply</PrimaryButton>
          </form>
        </Panel>

        <Panel title="Transfer">
          <form onSubmit={onTransfer} className="space-y-3">
            <Field label="SKU">
              <Select
                name="variantId"
                required
                className={fieldClass}
                placeholder="Select"
                options={variants.map((r) => ({
                  value: r.variantId,
                  label: `${r.variant.sku} · ${r.variant.product.title}`,
                }))}
              />
            </Field>
            <Field label="From">
              <Select
                name="fromLocationId"
                required
                className={fieldClass}
                placeholder="Select"
                options={locations.map((l) => ({ value: l.id, label: l.code }))}
              />
            </Field>
            <Field label="To">
              <Select
                name="toLocationId"
                required
                className={fieldClass}
                placeholder="Select"
                options={locations.map((l) => ({ value: l.id, label: l.code }))}
              />
            </Field>
            <Field label="Quantity">
              <input name="quantity" type="number" min={1} required defaultValue={1} className={fieldClass} />
            </Field>
            <PrimaryButton type="submit">Move stock</PrimaryButton>
          </form>
        </Panel>
      </div>

      <div className="mt-6">
        <DataTable headers={['SKU', 'Location', 'On hand', 'Reserved', 'Free']}>
          {rows.map((r) => (
            <tr key={r.id} className="hover:bg-ink/[0.02]">
              <Td>
                <span className="block font-medium">{r.variant.sku}</span>
                <span className="text-ink/55">{r.variant.product.title}</span>
              </Td>
              <Td muted>{r.location.code}</Td>
              <Td>{r.onHand}</Td>
              <Td>{r.reserved}</Td>
              <Td>{Math.max(0, r.onHand - r.reserved)}</Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
