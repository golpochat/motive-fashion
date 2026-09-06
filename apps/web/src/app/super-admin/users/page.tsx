'use client';

import { useEffect, useState } from 'react';
import { PermissionGate } from '@/components/permission-gate';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';
import { API } from '@/lib/api';

type Role = { id: string; slug: string; name: string };
type Person = {
  id: string;
  email: string;
  name: string;
  role: string;
  memberships: { role: Role }[];
};

export default function SuperAdminUsers() {
  const [people, setPeople] = useState<Person[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [notice, setNotice] = useState('');

  function reload() {
    Promise.all([
      fetch(`${API}/rbac/users`, { credentials: 'include' }).then((r) => r.json()) as Promise<Person[]>,
      fetch(`${API}/rbac/roles`, { credentials: 'include' }).then((r) => r.json()) as Promise<(Role & { system?: boolean })[]>,
    ]).then(([u, r]) => {
      setPeople(u);
      setRoles(r);
    });
  }

  useEffect(() => {
    reload();
  }, []);

  async function toggle(userId: string, roleId: string, on: boolean) {
    const person = people.find((p) => p.id === userId);
    if (!person) return;
    const next = on
      ? [...person.memberships.map((m) => m.role.id), roleId]
      : person.memberships.map((m) => m.role.id).filter((id) => id !== roleId);
    const res = await fetch(`${API}/rbac/users/${userId}/roles`, {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roleIds: next }),
    });
    setNotice(res.ok ? 'Roles updated.' : 'Update failed. Keep at least one super-admin.');
    reload();
  }

  return (
    <PermissionGate allow="rbac.users.assign">
      <div>
        <PageHeader
          title="Users"
          description="A person can hold several roles. Permissions are the union of every role they have."
        />
        {notice ? <p className="mb-4 text-sm">{notice}</p> : null}
        <DataTable headers={['Person', ...roles.map((r) => r.name)]}>
          {people.map((p) => {
            const held = new Set(p.memberships.map((m) => m.role.id));
            return (
              <tr key={p.id} className="hover:bg-ink/[0.02]">
                <Td>
                  <span className="block font-medium">{p.name}</span>
                  <span className="text-ink/55">{p.email}</span>
                </Td>
                {roles.map((r) => (
                  <Td key={r.id}>
                    <input
                      type="checkbox"
                      checked={held.has(r.id)}
                      onChange={(e) => toggle(p.id, r.id, e.target.checked)}
                    />
                  </Td>
                ))}
              </tr>
            );
          })}
        </DataTable>
      </div>
    </PermissionGate>
  );
}
