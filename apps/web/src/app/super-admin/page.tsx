'use client';

import Link from 'next/link';
import { useState } from 'react';
import { principalWorkspace } from '@motive-fashion/utils';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { DataTable, IconButton, JobCard, RowActions, SecondaryButton, Td } from '@/components/dashboard-ui';

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  system: boolean;
  _count: { members: number };
  permissions: { permission: { key: string } }[];
};

type Person = {
  id: string;
  name: string;
  email: string;
  mfaEnabled?: boolean;
  memberships?: { role: { id: string; slug: string; name: string } }[];
};
type Perm = { id: string };

function personKeys(person: Person, roles: RoleRow[]) {
  const ids = new Set((person.memberships ?? []).map((m) => m.role.id));
  const keys = new Set<string>();
  for (const role of roles) {
    if (!ids.has(role.id)) continue;
    for (const grant of role.permissions) keys.add(grant.permission.key);
  }
  return [...keys];
}

function workspaceLabel(person: Person, roles: RoleRow[]) {
  const ws = principalWorkspace(personKeys(person, roles));
  if (ws === 'super-admin') return 'Super admin';
  if (ws === 'admin') return 'Admin';
  if (ws === 'staff') return 'Staff';
  return 'Customer';
}

export default function SuperAdminHome() {
  const rolesQ = useConsoleQuery<RoleRow[]>('/rbac/roles', 'Could not load roles');
  const peopleQ = useConsoleQuery<Person[]>('/rbac/users', 'Could not load people');
  const permsQ = useConsoleQuery<Perm[]>('/rbac/permissions', 'Could not load permissions');
  const [exportError, setExportError] = useState('');
  const loading = rolesQ.loading || peopleQ.loading || permsQ.loading;
  const error = rolesQ.error || peopleQ.error || permsQ.error || exportError;
  const roles = rolesQ.data ?? [];
  const people = peopleQ.data ?? [];
  const perms = permsQ.data ?? [];
  const commerceAdmins = people.filter((person) => principalWorkspace(personKeys(person, roles)) === 'admin').length;
  const staff = people.filter((person) => person.memberships?.some((m) => m.role.slug === 'staff')).length;
  const mfaOn = people.filter((person) => person.mfaEnabled).length;
  const peopleRank = { 'super-admin': 0, admin: 1, staff: 2, customer: 3 } as const;
  const rankedPeople = [...people].sort((a, b) => {
    const wa = principalWorkspace(personKeys(a, roles));
    const wb = principalWorkspace(personKeys(b, roles));
    return peopleRank[wa] - peopleRank[wb] || a.name.localeCompare(b.name);
  });

  async function exportCsv() {
    setExportError('');
    const res = await fetch(`${API}/rbac/export`, { credentials: 'include' });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      setExportError(apiErrorMessage(payload, 'Could not export access.'));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'access.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Create roles, assign them to people, and keep the permission catalog in one place."
        actions={
          <SecondaryButton type="button" onClick={() => void exportCsv()}>
            Export CSV
          </SecondaryButton>
        }
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={() => {
          setExportError('');
          rolesQ.reload();
          peopleQ.reload();
          permsQ.reload();
        }}
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <StatCard label="Roles" value={String(roles.length)} hint="Visible roles" />
          <StatCard label="People" value={String(people.length)} hint="Assignable accounts" />
          <StatCard label="Permissions" value={String(perms.length)} hint="Assignable keys" />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <StatCard
            label="Commerce admins"
            value={String(commerceAdmins)}
            hint={commerceAdmins < 2 ? 'Keep a second admin so the console is not one person' : 'Can open /admin'}
          />
          <StatCard label="Shop floor" value={String(staff)} hint="Staff role" />
          <StatCard label="MFA on" value={String(mfaOn)} hint="People with TOTP enabled" />
        </div>

        <h2 className="mt-10 font-serif text-2xl [[data-theme=super-admin]_&]:font-sans">Roles</h2>
        <div className="mt-3">
          <DataTable
            headers={['Role', 'Members', 'Keys', 'Action']}
            cards={roles.map((role) => (
              <JobCard
                key={role.id}
                href={`/super-admin/users?role=${encodeURIComponent(role.slug)}`}
                title={role.name}
                meta={`${role._count.members} member${role._count.members === 1 ? '' : 's'} · ${role.permissions.length} keys`}
              />
            ))}
          >
            {roles.map((role) => (
              <tr key={role.id} className="hover:bg-ink/5">
                <Td>
                  {role.name}
                  <span className="mt-1 block text-xs text-ink/45">{role.system ? 'Built-in' : role.slug}</span>
                </Td>
                <Td>{role._count.members}</Td>
                <Td muted>{role.permissions.length}</Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton
                      label="People with this role"
                      icon="open"
                      href={`/super-admin/users?role=${encodeURIComponent(role.slug)}`}
                    />
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>
        </div>

        <h2 className="mt-10 font-serif text-2xl [[data-theme=super-admin]_&]:font-sans">People</h2>
        <div className="mt-3">
          <DataTable
            headers={['Name', 'Workspace', 'MFA', 'Action']}
            cards={rankedPeople.slice(0, 8).map((person) => (
              <JobCard
                key={person.id}
                href="/super-admin/users"
                title={person.name}
                meta={`${person.email} · ${workspaceLabel(person, roles)}`}
              />
            ))}
          >
            {rankedPeople.slice(0, 8).map((person) => (
              <tr key={person.id} className="hover:bg-ink/5">
                <Td>
                  {person.name}
                  <span className="mt-1 block text-xs text-ink/45">{person.email}</span>
                </Td>
                <Td muted>{workspaceLabel(person, roles)}</Td>
                <Td muted>{person.mfaEnabled ? 'On' : 'Off'}</Td>
                <Td nowrap>
                  <RowActions>
                    <IconButton label="Assign roles" icon="open" href="/super-admin/users" />
                  </RowActions>
                </Td>
              </tr>
            ))}
          </DataTable>
          {people.length > 8 ? (
            <p className="mt-3 text-sm">
              <Link href="/super-admin/users" className="no-underline">
                View all people
              </Link>
            </p>
          ) : null}
        </div>
      </ConsoleSection>
    </div>
  );
}
