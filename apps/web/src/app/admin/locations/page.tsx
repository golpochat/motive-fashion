'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, Modal, PrimaryButton, SecondaryButton, Select, Td, fieldClass } from '@/components/dashboard-ui';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type Location = { id: string; code: string; name: string; type: string; address: string | null; active: boolean };

const TYPES = [
  { value: 'WAREHOUSE', label: 'Warehouse' },
  { value: 'SHOP', label: 'Shop' },
  { value: 'POPUP', label: 'Pop-up' },
];

export default function AdminLocations() {
  const { me } = useSession();
  const canWrite = hasPerm(me, 'dashboard.admin');
  const { data, error, loading, reload } = useConsoleQuery<Location[]>('/admin/locations', 'Could not load locations');
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Location | null>(null);
  const [formError, setFormError] = useState('');
  const [busy, setBusy] = useState(false);
  const rows = data ?? [];

  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/locations`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code: form.get('code'),
        name: form.get('name'),
        type: form.get('type'),
        address: String(form.get('address') || '') || undefined,
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not add this location.'));
      return;
    }
    setCreating(false);
    reload();
  }

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/locations/${editing.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.get('name'),
        type: form.get('type'),
        address: String(form.get('address') || '') || null,
        active: form.get('active') === 'true',
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setFormError(apiErrorMessage(payload, 'Could not update this location.'));
      return;
    }
    setEditing(null);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Locations"
        description="Warehouse, shop floor, and pop-up stock rooms."
        actions={
          canWrite ? (
            <PrimaryButton type="button" onClick={() => { setFormError(''); setCreating(true); }}>
              Add location
            </PrimaryButton>
          ) : null
        }
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No locations"
        emptyBody="Add a stock room before you transfer inventory."
      >
        <DataTable headers={['Code', 'Name', 'Type', 'Status', '']}>
          {rows.map((l) => (
            <tr key={l.id} className="hover:bg-ink/5">
              <Td>{l.code}</Td>
              <Td>
                {l.name}
                {l.address ? <span className="mt-1 block text-xs text-ink/45">{l.address}</span> : null}
              </Td>
              <Td muted>{TYPES.find((t) => t.value === l.type)?.label ?? l.type}</Td>
              <Td muted>{l.active ? 'Active' : 'Inactive'}</Td>
              <Td>
                {canWrite ? (
                  <SecondaryButton type="button" onClick={() => { setFormError(''); setEditing(l); }}>
                    Edit
                  </SecondaryButton>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
      {creating ? (
        <Modal title="Add location" onClose={() => setCreating(false)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void create(e)} className="space-y-3">
            <Field label="Code">
              <input name="code" required className={fieldClass} placeholder="DUB-WH" />
            </Field>
            <Field label="Name">
              <input name="name" required className={fieldClass} />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue="WAREHOUSE" options={TYPES} />
            </Field>
            <Field label="Address">
              <input name="address" className={fieldClass} />
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
        <Modal title="Edit location" onClose={() => setEditing(null)}>
          {formError ? <p className="mb-3 text-sm text-red-700">{formError}</p> : null}
          <form onSubmit={(e) => void save(e)} className="space-y-3">
            <Field label="Name">
              <input name="name" required defaultValue={editing.name} className={fieldClass} />
            </Field>
            <Field label="Type">
              <Select name="type" defaultValue={editing.type} options={TYPES} />
            </Field>
            <Field label="Address">
              <input name="address" defaultValue={editing.address ?? ''} className={fieldClass} />
            </Field>
            <Field label="Status">
              <Select
                name="active"
                defaultValue={editing.active ? 'true' : 'false'}
                options={[
                  { value: 'true', label: 'Active' },
                  { value: 'false', label: 'Inactive' },
                ]}
              />
            </Field>
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
