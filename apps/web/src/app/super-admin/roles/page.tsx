'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { AccessTabs } from '@/components/access-tabs';
import { DataTable, Field, Modal, PrimaryButton, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';

type Perm = { id: string; key: string; name: string; group: string };
type RoleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  system: boolean;
  _count: { members: number };
  permissions: { permission: { key: string } }[];
};

export default function SuperAdminRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<RoleRow | 'new' | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);

  function reload() {
    Promise.all([
      fetch(`${API}/rbac/roles`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])) as Promise<RoleRow[]>,
      fetch(`${API}/rbac/permissions`, { credentials: 'include' }).then((r) => (r.ok ? r.json() : [])) as Promise<Perm[]>,
    ]).then(([r, p]) => {
      setRoles(Array.isArray(r) ? r : []);
      setPerms(Array.isArray(p) ? p : []);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  function openCreate() {
    setError('');
    setEditing('new');
    setName('');
    setDescription('');
    setSelected(new Set());
  }

  function openEdit(role: RoleRow) {
    setError('');
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setSelected(new Set(role.permissions.map((g) => g.permission.key)));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const body = { name, description, permissionKeys: [...selected] };
    const res =
      editing === 'new'
        ? await fetch(`${API}/rbac/roles`, {
            method: 'POST',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
        : await fetch(`${API}/rbac/roles/${editing?.id}`, {
            method: 'PATCH',
            credentials: 'include',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          });
    const payload = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not save this role.'));
      return;
    }
    setEditing(null);
    reload();
  }

  async function remove() {
    if (!confirmDelete) return;
    const res = await fetch(`${API}/rbac/roles/${confirmDelete.id}`, { method: 'DELETE', credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not delete this role.'));
      setConfirmDelete(null);
      return;
    }
    setConfirmDelete(null);
    reload();
  }

  const groups = [...new Set(perms.map((p) => p.group))];

  return (
    <div>
      <PageHeader
        title="Access"
        description="Create roles and choose which permissions they grant. System roles can be edited but not deleted."
        actions={
          <PrimaryButton type="button" onClick={openCreate}>
            New role
          </PrimaryButton>
        }
      />
      <AccessTabs current="/super-admin/roles" />
      {error && !editing ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <DataTable headers={['Role', 'People', 'Permissions', 'Action']}>
        {roles.map((r) => (
          <tr key={r.id} className="hover:bg-ink/[0.02]">
            <Td>
              <span className="block font-medium">{r.name}</span>
              {r.system ? <span className="text-xs text-ink/45">System</span> : null}
            </Td>
            <Td>{r._count.members}</Td>
            <Td>{r.permissions.length}</Td>
            <Td>
              <div className="flex flex-wrap gap-2">
                <SecondaryButton type="button" onClick={() => openEdit(r)}>
                  Edit
                </SecondaryButton>
                {r.system ? null : (
                  <SecondaryButton type="button" onClick={() => setConfirmDelete(r)}>
                    Delete
                  </SecondaryButton>
                )}
              </div>
            </Td>
          </tr>
        ))}
      </DataTable>

      {editing ? (
        <Modal title={editing === 'new' ? 'New role' : `Edit ${editing.name}`} onClose={() => setEditing(null)} wide>
          <form onSubmit={(e) => void save(e)} className="space-y-4">
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            <Field label="Name">
              <input value={name} onChange={(e) => setName(e.target.value)} required className={fieldClass} />
            </Field>
            <Field label="Description">
              <input value={description} onChange={(e) => setDescription(e.target.value)} className={fieldClass} />
            </Field>
            <div className="max-h-72 space-y-4 overflow-y-auto">
              {groups.map((group) => (
                <div key={group}>
                  <p className="text-xs uppercase tracking-wider text-ink/50">{group}</p>
                  <ul className="mt-2 space-y-1.5 text-sm">
                    {perms
                      .filter((p) => p.group === group)
                      .map((p) => (
                        <li key={p.key}>
                          <label className="flex items-start gap-2">
                            <input
                              type="checkbox"
                              className="mt-1 accent-ink"
                              checked={selected.has(p.key)}
                              onChange={() => {
                                const next = new Set(selected);
                                if (next.has(p.key)) next.delete(p.key);
                                else next.add(p.key);
                                setSelected(next);
                              }}
                            />
                            <span>
                              {p.name}
                              <span className="block text-xs text-ink/45">{p.key}</span>
                            </span>
                          </label>
                        </li>
                      ))}
                  </ul>
                </div>
              ))}
            </div>
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
        <Modal title="Delete role" onClose={() => setConfirmDelete(null)}>
          <p className="text-sm text-ink/70">
            Delete {confirmDelete.name}? People keep any other roles, or fall back to Customer.
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
