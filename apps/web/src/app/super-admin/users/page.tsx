'use client';

import { useEffect, useState } from 'react';
import { PermissionGate } from '@/components/permission-gate';
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
      <h1 className="font-serif text-3xl">Users</h1>
      <p className="mt-2 text-sm text-ink/70">A user can hold several roles. Permissions are the union.</p>
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      <div className="mt-6 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr>
              <th>Person</th>
              {roles.map((r) => (
                <th key={r.id}>{r.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {people.map((p) => {
              const held = new Set(p.memberships.map((m) => m.role.id));
              return (
                <tr key={p.id} className="border-t">
                  <td className="py-2">
                    {p.name}
                    <div className="text-ink/50">{p.email}</div>
                  </td>
                  {roles.map((r) => (
                    <td key={r.id}>
                      <input
                        type="checkbox"
                        checked={held.has(r.id)}
                        onChange={(e) => toggle(p.id, r.id, e.target.checked)}
                      />
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
    </PermissionGate>
  );
}
