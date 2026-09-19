'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { AccessTabs } from '@/components/access-tabs';
import {
  DataTable,
  Field,
  FilterTabs,
  JobCard,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Td,
  fieldClass,
  IconButton,
  RowActions,
} from '@/components/dashboard-ui';
import { API, apiErrorMessage } from '@/lib/api';

type Role = {
  id: string;
  slug: string;
  name: string;
  system?: boolean;
  permissions?: { permission: { key: string } }[];
};
type Perm = { key: string; name: string; group: string };
type Person = {
  id: string;
  email: string;
  name: string;
  mfaEnabled?: boolean;
  emailVerified?: boolean;
  memberships: { role: Role }[];
};

export default function SuperAdminUsers() {
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
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
      fetch(`${API}/rbac/permissions`, { credentials: 'include' }),
    ])
      .then(async ([usersRes, rolesRes, permsRes]) => {
        if (!usersRes.ok || !rolesRes.ok || !permsRes.ok) {
          setLoadError('Could not load people');
          return;
        }
        const u = (await usersRes.json()) as Person[];
        const r = (await rolesRes.json()) as Role[];
        const p = (await permsRes.json()) as Perm[];
        setPeople(Array.isArray(u) ? u : []);
        setRoles(Array.isArray(r) ? r : []);
        setPerms(Array.isArray(p) ? p : []);
        setLoadError('');
      })
      .catch(() => setLoadError('Could not load people'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    reload();
    const slug = new URLSearchParams(window.location.search).get('role');
    if (slug) setRoleFilter(slug);
  }, []);

  function changeRoleFilter(id: string) {
    setRoleFilter(id);
    const url = new URL(window.location.href);
    if (id === 'all') url.searchParams.delete('role');
    else url.searchParams.set('role', id);
    window.history.replaceState(null, '', `${url.pathname}${url.search}`);
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return people.filter((p) => {
      if (roleFilter !== 'all' && !p.memberships.some((m) => m.role.slug === roleFilter)) return false;
      if (!q) return true;
      return p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q);
    });
  }, [people, query, roleFilter]);

  const effective = useMemo(() => {
    const keys = new Set<string>();
    const chosen = roles.filter((role) => selected.has(role.id));
    if (!chosen.length) keys.add('dashboard.customer');
    for (const role of chosen) {
      for (const grant of role.permissions ?? []) keys.add(grant.permission.key);
    }
    if (keys.has('*')) return perms;
    return perms.filter((perm) => keys.has(perm.key));
  }, [roles, selected, perms]);

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

  const roleTabs = [{ id: 'all', label: 'All' }, ...roles.map((role) => ({ id: role.slug, label: role.name }))];

  return (
    <PermissionGate allow="rbac.users.assign">
      <div>
        <PageHeader
          title="Access"
          description="Assign roles to people. Permissions are the union of every role they hold."
        />
        <AccessTabs current="/super-admin/users" />
        <div className="mb-4 max-w-sm">
          <Field label="Find a person">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email"
              className={fieldClass}
              autoComplete="off"
            />
          </Field>
        </div>
        <div className="mb-4">
          <FilterTabs ariaLabel="Roles" items={roleTabs} current={roleFilter} onChange={changeRoleFilter} />
        </div>
        <ConsoleSection
          loading={loading}
          error={loadError}
          onRetry={reload}
          empty={visible.length === 0}
          emptyTitle="No people"
          emptyBody="Accounts you can assign roles to will appear here."
        >
          <DataTable
            headers={['Person', 'Roles', 'MFA', 'Action']}
            cards={visible.map((p) => (
              <JobCard
                key={p.id}
                title={p.name}
                meta={`${p.email} · ${p.memberships.map((m) => m.role.name).join(', ') || 'Customer'}${p.mfaEnabled ? ' · MFA' : ''}`}
                actions={
                  <RowActions>
                    <IconButton label="Edit roles" icon="edit" onClick={() => openEdit(p)} />
                  </RowActions>
                }
              />
            ))}
          >
            {visible.map((p) => (
              <tr key={p.id} className="hover:bg-ink/[0.02]">
                <Td>
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-ink/55">{p.email}</span>
                </Td>
                <Td>{p.memberships.map((m) => m.role.name).join(', ') || 'Customer'}</Td>
                <Td muted>{p.mfaEnabled ? 'On' : 'Off'}</Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton label="Edit roles" icon="edit" onClick={() => openEdit(p)} />
                  </RowActions>
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
              <ul className="max-h-56 space-y-2 overflow-y-auto text-sm">
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
              <div>
                <p className="text-xs uppercase tracking-wider text-ink/50">Effective permissions</p>
                <p className="mt-1 text-xs text-ink/55">
                  {effective.length ? effective.map((perm) => perm.name).join(' · ') : 'Customer account only'}
                </p>
              </div>
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
