'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { AccessTabs } from '@/components/access-tabs';
import { DataTable, Field, FilterTabs, Modal, PrimaryButton, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';

type Perm = { id: string; key: string; name: string; group: string; builtin?: boolean };

export default function SuperAdminPermissions() {
  const [perms, setPerms] = useState<Perm[]>([]);
  const [group, setGroup] = useState('All');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Perm | 'new' | null>(null);
  const [form, setForm] = useState({ key: '', name: '', group: '' });
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Perm | null>(null);

  function reload() {
    setLoading(true);
    fetch(`${API}/rbac/permissions`, { credentials: 'include' })
      .then(async (r) => {
        if (!r.ok) {
          setLoadError('Could not load permissions');
          return;
        }
        const rows = (await r.json()) as Perm[];
        setPerms(Array.isArray(rows) ? rows : []);
        setLoadError('');
      })
      .catch(() => setLoadError('Could not load permissions'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const groups = ['All', ...[...new Set(perms.map((p) => p.group))].sort((a, b) => a.localeCompare(b, 'en-IE'))];
  const rows = useMemo(
    () => (group === 'All' ? perms : perms.filter((p) => p.group === group)),
    [perms, group],
  );

  function openCreate() {
    setError('');
    setEditing('new');
    setForm({ key: '', name: '', group: group === 'All' ? 'Custom' : group });
  }

  function openEdit(perm: Perm) {
    setError('');
    setEditing(perm);
    setForm({ key: perm.key, name: perm.name, group: perm.group });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const res =
      editing === 'new'
        ? await fetch(`${API}/rbac/permissions`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(form),
          })
        : await fetch(`${API}/rbac/permissions/${editing?.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: form.name, group: form.group }),
          });
    const payload = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not save this permission.'));
      return;
    }
    setEditing(null);
    reload();
  }

  async function remove() {
    if (!confirmDelete) return;
    const res = await fetch(`${API}/rbac/permissions/${confirmDelete.id}`, { method: 'DELETE', credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not delete this permission.'));
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Access"
        description="Built-in keys unlock screens in the app. You can rename them, group them, and add extra keys for roles you define."
        actions={
          <PrimaryButton type="button" onClick={openCreate}>
            New permission
          </PrimaryButton>
        }
      />
      <AccessTabs current="/super-admin/permissions" />
      {error && !editing ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Permission groups"
          items={groups.map((name) => ({ id: name, label: name }))}
          current={group}
          onChange={setGroup}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={loadError}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No permissions"
        emptyBody="Keys in this group will appear here."
      >
      <DataTable headers={['Permission', 'Key', 'Group', 'Action']}>
        {rows.map((p) => (
          <tr key={p.id} className="hover:bg-ink/[0.02]">
            <Td>{p.name}</Td>
            <Td muted>
              <code>{p.key}</code>
            </Td>
            <Td>{p.group}</Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton type="button" onClick={() => openEdit(p)}>
                  Edit
                </SecondaryButton>
                {p.builtin ? null : (
                  <SecondaryButton type="button" onClick={() => setConfirmDelete(p)}>
                    Delete
                  </SecondaryButton>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>
      </ConsoleSection>

      {editing ? (
        <Modal title={editing === 'new' ? 'New permission' : 'Edit permission'} onClose={() => setEditing(null)}>
          <form onSubmit={(e) => void save(e)} className="space-y-3">
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <Field label="Name">
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Group">
              <input
                value={form.group}
                onChange={(e) => setForm({ ...form, group: e.target.value })}
                required
                className={fieldClass}
              />
            </Field>
            <Field label="Key">
              <input
                value={form.key}
                onChange={(e) => setForm({ ...form, key: e.target.value })}
                required
                disabled={editing !== 'new'}
                placeholder="team.reports"
                className={fieldClass}
              />
            </Field>
            {editing === 'new' ? (
              <p className="text-xs text-ink/50">
                Keys only unlock a screen when the product checks them. Use a dotted name like team.reports.
              </p>
            ) : null}
            <div className="flex gap-2">
              <PrimaryButton type="submit" disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setEditing(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {confirmDelete ? (
        <Modal title="Delete permission" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink/70">
            Delete {confirmDelete.name}? It will be removed from every role that currently grants it.
          </p>
          <div className="mt-4 flex gap-2">
            <PrimaryButton type="button" onClick={() => void remove()}>
              Delete
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setConfirmDelete(null)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
