'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, IconButton, Modal, PrimaryButton, RowActions, SecondaryButton, Select, Td, fieldClass } from '@/components/dashboard-ui';
import { formatUnits } from '@/lib/supply';
import {
  DEFAULT_SUPPLIER_COUNTRY,
  SUPPLIER_COUNTRIES,
  supplierCountryCode,
  supplierCountryLabel,
} from '@motive-fashion/config';

type Supplier = {
  id: string;
  name: string;
  country: string;
  email: string | null;
  phone: string | null;
  notes: string | null;
  example: boolean;
  skuCount: number;
  orderedUnits: number;
  inTransitUnits: number;
  sold30d: number;
};

const COUNTRY_OPTIONS = SUPPLIER_COUNTRIES.map((row) => ({ value: row.code, label: row.name }));

function countryOptionsFor(current?: string) {
  const code = supplierCountryCode(current);
  if (!current || code) return COUNTRY_OPTIONS;
  return [{ value: current, label: current }, ...COUNTRY_OPTIONS];
}

export default function AdminSuppliers() {
  const router = useRouter();
  const { data, error, loading, reload } = useConsoleQuery<Supplier[]>(
    '/admin/procurement/suppliers',
    'Could not load suppliers',
  );
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = data ?? [];

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/procurement/suppliers`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        country: form.get('country'),
        email: form.get('email'),
        phone: form.get('phone'),
        notes: form.get('notes'),
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this supplier.'));
      return;
    }
    setCreating(false);
    const created = payload as { id?: string };
    if (created.id) {
      router.push(`/admin/suppliers/${created.id}`);
      return;
    }
    reload();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/procurement/suppliers/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        country: form.get('country'),
        email: form.get('email'),
        phone: form.get('phone'),
        notes: form.get('notes'),
        example: form.get('example') === 'true',
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this supplier.'));
      return;
    }
    setEditing(null);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Suppliers"
        description="Who we buy from, what is still with the factory, what is on the water, and what sold in the last 30 days."
        actions={
          <PrimaryButton type="button" onClick={() => { setFormError(''); setCreating(true); }}>
            Add supplier
          </PrimaryButton>
        }
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No suppliers"
        emptyBody="Add a mill or wholesaler to raise purchase orders."
      >
        <DataTable headers={['Supplier', 'Ordered', 'On the way', 'Sold (30d)', 'SKUs', 'Action']}>
          {rows.map((s) => (
            <tr key={s.id} className="hover:bg-ink/5">
              <Td>
                <Link href={`/admin/suppliers/${s.id}`} className="font-medium no-underline hover:text-accent">
                  {s.name}
                </Link>
                <span className="mt-1 block text-xs text-ink/45">
                  {supplierCountryLabel(s.country)}
                  {s.example ? ' · Example' : ''}
                </span>
              </Td>
              <Td>{formatUnits(s.orderedUnits)}</Td>
              <Td>{formatUnits(s.inTransitUnits)}</Td>
              <Td>{formatUnits(s.sold30d)}</Td>
              <Td muted>{formatUnits(s.skuCount)}</Td>
              <Td nowrap>
                <RowActions>
                  <IconButton label="Open supplier" icon="open" href={`/admin/suppliers/${s.id}`} />
                  <IconButton label="Edit supplier" icon="edit" onClick={() => { setFormError(''); setEditing(s); }} />
                </RowActions>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
      {creating ? (
        <Modal title="Add supplier" onClose={() => setCreating(false)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void create(e)} className="space-y-3">
            <Field label="Name">
              <input name="name" required className={fieldClass} />
            </Field>
            <Field label="Country">
              <Select
                name="country"
                required
                defaultValue={DEFAULT_SUPPLIER_COUNTRY}
                options={COUNTRY_OPTIONS}
                placeholder="Select a country"
              />
            </Field>
            <Field label="Email">
              <input name="email" type="email" className={fieldClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" className={fieldClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} className={fieldClass} />
            </Field>
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setCreating(false)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
      {editing ? (
        <Modal title="Edit supplier" onClose={() => setEditing(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void save(e)} className="space-y-3">
            <Field label="Name">
              <input name="name" required defaultValue={editing.name} className={fieldClass} />
            </Field>
            <Field label="Country">
              <Select
                name="country"
                required
                defaultValue={supplierCountryCode(editing.country) ?? editing.country}
                options={countryOptionsFor(editing.country)}
                placeholder="Select a country"
              />
            </Field>
            <Field label="Email">
              <input name="email" type="email" defaultValue={editing.email ?? ''} className={fieldClass} />
            </Field>
            <Field label="Phone">
              <input name="phone" defaultValue={editing.phone ?? ''} className={fieldClass} />
            </Field>
            <Field label="Notes">
              <textarea name="notes" rows={2} defaultValue={editing.notes ?? ''} className={fieldClass} />
            </Field>
            <label className="flex min-h-11 items-center gap-2 text-sm">
              <input type="checkbox" name="example" value="true" defaultChecked={editing.example} />
              Example contact
            </label>
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                Save
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}
