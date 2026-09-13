'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { AccessTabs } from '@/components/access-tabs';
import { DataTable, Modal, PrimaryButton, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';
import { API, apiErrorMessage } from '@/lib/api';

type Role = { id: string; slug: string; name: string; system?: boolean };
type Person = {
  id: string;
  email: string;
  name: string;
  memberships: { role: Role }[];
};

export default function SuperAdminUsers() {
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState<Person | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  function reload() {
    setLoading(true);
    Promise.all([
      fetch(`${API}/rbac/users`, { credentials: 'include' }),
      fetch(`${API}/rbac/roles`, { credentials: 'include' }),
    ])
      .then(async ([usersRes, rolesRes]) => {
        if (!usersRes.ok || !rolesRes.ok) {
          setLoadError('Could not load people');
          return;
        }
        const u = (await usersRes.json()) as Person[];
        const r = (await rolesRes.json()) as Role[];
        setPeople(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
        setLoadError('');
      })
      .catch(() => setLoadError('Could not load people'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
  }, []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return people;
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q));
  }, [people, query]);

  function openEdit(person: Person) {
    setError('');
    setEditing(person);
    setSelected(new Set(person.memberships.map((m) => m.role.id)));
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    setError('');
    const res = await fetch(`${API}/rbac/users/${editing.id}/roles`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: [...selected] }),
    });
    const payload = await res.json().catch(() => null);
    setSaving(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not update roles.'));
      return;
    }
    setEditing(null);
    reload();
  }

  return (
    <PermissionGate allow="rbac.users.assign">
      <div>
        <PageHeader
          title="Access"
          description="Assign roles to people. Permissions are the union of every role they hold."
        />
        <AccessTabs current="/super-admin/users" />
        <div className="mb-4 max-w-sm">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or email"
            className={fieldClass}
          />
        </div>
        <ConsoleSection
          loading={loading}
          error={loadError}
          onRetry={reload}
          empty={visible.length === 0}
          emptyTitle="No people"
          emptyBody="Accounts you can assign roles to will appear here."
        >
        <DataTable headers={['Person', 'Roles', 'Action']}>
          {visible.map((p) => (
            <tr key={p.id} className="hover:bg-ink/[0.02]">
              <Td>
                <span className="block font-medium">{p.name}</span>
                <span className="text-ink/55">{p.email}</span>
              </Td>
              <Td>{p.memberships.map((m) => m.role.name).join(', ') || 'Customer'}</Td>
              <Td>
                <SecondaryButton type="button" onClick={() => openEdit(p)}>
                  Edit roles
                </SecondaryButton>
              </Td>
            </tr>
          ))}
        </DataTable>
        </ConsoleSection>
        {editing ? (
          <Modal title={`Roles for ${editing.name}`} onClose={() => setEditing(null)}>
            <form onSubmit={(e) => void save(e)} className="space-y-4">
              {error ? (
                <p className="text-sm text-red-700" role="alert">
                  {error}
                </p>
              ) : null}
              <ul className="max-h-72 space-y-2 overflow-y-auto text-sm">
                {roles.map((role) => (
                  <li key={role.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        className="accent-ink"
                        checked={selected.has(role.id)}
                        onChange={() => {
                          const next = new Set(selected);
                          if (next.has(role.id)) next.delete(role.id);
                          else next.add(role.id);
                          setSelected(next);
                        }}
                      />
                      <span>
                        {role.name}
                        {role.system ? <span className="text-ink/45"> · system</span> : null}
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-ink/50">If none are selected, the person keeps the Customer role.</p>
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
      </div>
    </PermissionGate>
  );
}
