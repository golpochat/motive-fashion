'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { PageHeader, StatCard, DashCard } from '@/components/page-header';

type RoleRow = {
  id: string;
  name: string;
  slug: string;
  system: boolean;
  _count: { members: number };
  permissions: unknown[];
};

type Person = { id: string };

type Perm = { id: string; key: string };

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
        description="This is the super-admin workspace. It governs who can open every other console."
      />
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Roles" value={String(roles.length)} hint="System plus custom" />
        <StatCard label="People" value={String(people.length)} hint="With at least one role" />
        <StatCard label="Permissions" value={String(perms.length)} hint="Fixed catalog" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        <DashCard href="/super-admin/roles" icon="roles" label="Create and edit roles" body="Tick permissions, then assign the role to people." />
        <DashCard href="/super-admin/users" icon="users" label="Assign access" body="A person can hold several roles. Permissions are the union." />
        <DashCard href="/super-admin/permissions" icon="permissions" label="Review permissions" body="Keys are fixed. Roles choose which ones they grant." />
      </div>
      <h2 className="mt-10 font-serif text-2xl">Roles</h2>
      <ul className="mt-4 divide-y divide-ink/10 rounded-2xl border border-ink/10 bg-white">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between px-5 py-3 text-sm">
            <span>
              <Link href={`/super-admin/roles/${r.id}`}>{r.name}</Link>
              <span className="text-ink/50">
                {' '}
                · {r.slug}
                {r.system ? ' · system' : ''}
              </span>
            </span>
            <span className="text-ink/50">
              {r._count.members} people · {r.permissions.length} perms
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
