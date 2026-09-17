'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard, DashCard } from '@/components/page-header';

type RoleRow = {
  id: string;
  name: string;
  system: boolean;
  _count: { members: number };
  permissions: unknown[];
};

type Person = { id: string };
type Perm = { id: string };

export default function SuperAdminHome() {
  const rolesQ = useConsoleQuery<RoleRow[]>('/rbac/roles', 'Could not load roles');
  const peopleQ = useConsoleQuery<Person[]>('/rbac/users', 'Could not load people');
  const permsQ = useConsoleQuery<Perm[]>('/rbac/permissions', 'Could not load permissions');
  const loading = rolesQ.loading || peopleQ.loading || permsQ.loading;
  const error = rolesQ.error || peopleQ.error || permsQ.error;
  const roles = rolesQ.data ?? [];
  const people = peopleQ.data ?? [];
  const perms = permsQ.data ?? [];

  return (
    <div>
      <PageHeader
        title="Overview"
        description="Create roles, assign them to people, and keep the permission catalog in one place."
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={() => {
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
        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <DashCard href="/super-admin/users" icon="users" label="Users" body="Search people and assign roles from a modal." />
          <DashCard href="/super-admin/roles" icon="roles" label="Roles" body="Create and edit roles, including which permissions they grant." />
          <DashCard href="/super-admin/permissions" icon="permissions" label="Permissions" body="Rename, group, and add keys. Built-in keys stay in the product." />
          <DashCard href="/super-admin/audit" icon="permissions" label="Audit" body="Search recent admin writes: roles, catalog, orders, stock." />
        </div>
      </ConsoleSection>
    </div>
  );
}
