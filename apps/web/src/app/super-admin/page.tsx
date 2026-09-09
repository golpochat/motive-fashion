'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader, StatCard, DashCard } from '@/components/page-header';

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
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [people, setPeople] = useState<Person[]>([]);
  const [perms, setPerms] = useState<Perm[]>([]);

  useEffect(() => {
    fetch(`${API}/rbac/roles`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRoles);
    fetch(`${API}/rbac/users`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPeople);
    fetch(`${API}/rbac/permissions`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPerms);
  }, []);

  return (
    <div>
      <PageHeader
        title="Access control"
        description="Create roles, assign them to people, and keep the permission catalog in one place."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Roles" value={String(roles.length)} hint="Visible roles" />
        <StatCard label="People" value={String(people.length)} hint="Assignable accounts" />
        <StatCard label="Permissions" value={String(perms.length)} hint="Assignable keys" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DashCard href="/super-admin/users" icon="users" label="Users" body="Search people and assign roles from a modal." />
        <DashCard href="/super-admin/roles" icon="roles" label="Roles" body="Create and edit roles, including which permissions they grant." />
        <DashCard href="/super-admin/permissions" icon="permissions" label="Permissions" body="Rename, group, and add keys. Built-in keys stay in the product." />
      </div>
    </div>
  );
}
