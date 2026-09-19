'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { AccessTabs } from '@/components/access-tabs';
import {
  DataTable,
  Field,
  JobCard,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Td,
  fieldClass,
  IconButton,
  RowActions,
} from '@/components/dashboard-ui';

type Perm = { id: string; key: string; name: string; group: string };
type Member = { user: { id: string; name: string; email: string } };
type RoleRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  system: boolean;
  _count: { members: number };
  permissions: { permission: { key: string } }[];
  members?: Member[];
};

export default function SuperAdminRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<RoleRow | 'new' | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<RoleRow | null>(null);

  function reload() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/rbac/roles`, { credentials: 'include' }),
      fetch(`${API}/rbac/permissions`, { credentials: 'include' }),
    ])
      .then(async ([rolesRes, permsRes]) => {
        if (!rolesRes.ok || !permsRes.ok) {
          setLoadError('Could not load roles');
          return;
        }
        const r = (await rolesRes.json()) as RoleRow[];
        const p = (await permsRes.json()) as Perm[];
        setRoles(Array.isArray(r) ? r : []);
        setPerms(Array.isArray(p) ? p : []);
        setLoadError('');
      })
      .catch(() => setLoadError('Could not load roles'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(q) ||
        role.slug.includes(q) ||
        role.description.toLowerCase().includes(q),
    );
  }, [roles, query]);

  function openCreate() {
    setError('');
    setEditing('new');
    setMembers([]);
    setName('');
    setDescription('');
    setSelected(new Set());
  }

  async function openEdit(role: RoleRow) {
    setError('');
    setEditing(role);
    setName(role.name);
    setDescription(role.description);
    setSelected(new Set(role.permissions.map((g) => g.permission.key)));
    setMembers([]);
    const res = await fetch(`${API}/rbac/roles/${role.id}`, { credentials: 'include' });
    if (!res.ok) return;
    const detail = (await res.json()) as RoleRow;
    setMembers(Array.isArray(detail.members) ? detail.members : []);
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

  async function clone(role: RoleRow) {
    setError('');
    const res = await fetch(`${API}/rbac/roles/${role.id}/clone`, { method: 'POST', credentials: 'include' });
    const payload = await res.json().catch(() => null);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not clone this role.'));
      return;
    }
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

  function toggleGroup(group: string) {
    const keys = perms.filter((p) => p.group === group).map((p) => p.key);
    const next = new Set(selected);
    const allOn = keys.every((key) => next.has(key));
    for (const key of keys) {
      if (allOn) next.delete(key);
      else next.add(key);
    }
    setSelected(next);
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
      <div className="mb-4 max-w-sm">
        <Field label="Find a role">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name or slug"
            className={fieldClass}
            autoComplete="off"
          />
        </Field>
      </div>
      <ConsoleSection
        loading={loading}
        error={loadError}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={query.trim() ? 'No matching roles' : 'No roles'}
        emptyBody={query.trim() ? 'Try another name.' : 'Create a role to grant permissions.'}
      >
        <DataTable
          headers={['Role', 'People', 'Permissions', 'Action']}
          cards={visible.map((r) => (
            <JobCard
              key={r.id}
              title={r.name}
              meta={`${r.system ? 'System · ' : ''}${r._count.members} people · ${r.permissions.length} keys`}
              actions={
                <RowActions>
                  <IconButton label="Clone role" icon="copy" onClick={() => void clone(r)} />
                  <IconButton label="Edit role" icon="edit" onClick={() => void openEdit(r)} />
                  {r.system ? null : (
                    <IconButton label="Delete role" icon="trash" tone="danger" onClick={() => setConfirmDelete(r)} />
                  )}
                </RowActions>
              }
            />
          ))}
        >
          {visible.map((r) => (
            <tr key={r.id} className="hover:bg-ink/[0.02]">
              <Td>
                <span className="block font-medium">{r.name}</span>
                {r.system ? <span className="text-xs text-ink/45">System</span> : <span className="text-xs text-ink/45">{r.slug}</span>}
              </Td>
              <Td>
                <Link href={`/super-admin/users?role=${encodeURIComponent(r.slug)}`} className="no-underline hover:text-accent">
                  {r._count.members}
                </Link>
              </Td>
              <Td>{r.permissions.length}</Td>
              <Td nowrap>
                <RowActions>
                  <IconButton label="Clone role" icon="copy" onClick={() => void clone(r)} />
                  <IconButton label="Edit role" icon="edit" onClick={() => void openEdit(r)} />
                  {r.system ? null : (
                    <IconButton label="Delete role" icon="trash" tone="danger" onClick={() => setConfirmDelete(r)} />
                  )}
                </RowActions>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>

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
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-xs uppercase tracking-wider text-ink/50">{group}</p>
                    <button type="button" className="text-xs text-ink/55 hover:text-ink" onClick={() => toggleGroup(group)}>
                      {perms.filter((p) => p.group === group).every((p) => selected.has(p.key)) ? 'Clear' : 'Select all'}
                    </button>
                  </div>
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
            {editing !== 'new' && members.length ? (
              <div>
                <p className="text-xs uppercase tracking-wider text-ink/50">People</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {members.map((m) => (
                    <li key={m.user.id}>
                      <Link href={`/super-admin/users?role=${encodeURIComponent(editing.slug)}`} className="no-underline hover:text-accent">
                        {m.user.name}
                        <span className="text-ink/45"> · {m.user.email}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
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
