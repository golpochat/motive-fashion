'use client';

import { useState } from 'react';
import { principalWorkspace } from '@motive-fashion/utils';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard, DashCard } from '@/components/page-header';
import { SecondaryButton } from '@/components/dashboard-ui';

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
  mfaEnabled?: boolean;
  memberships?: { role: { id: string; slug: string } }[];
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
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <DashCard href="/super-admin/users" icon="users" label="Users" body="Filter by role, preview effective keys, and assign from a modal." />
          <DashCard href="/super-admin/roles" icon="roles" label="Roles" body="Clone a role, edit grants, or jump to the people who hold it." />
          <DashCard href="/super-admin/permissions" icon="permissions" label="Permissions" body="See which roles grant a key. Built-in keys stay in the product." />
          <DashCard href="/super-admin/audit" icon="permissions" label="Audit" body="Role, permission, and assignment writes." />
        </div>
      </ConsoleSection>
    </div>
  );
}
