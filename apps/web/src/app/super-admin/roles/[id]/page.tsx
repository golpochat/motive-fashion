'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { API } from '@/lib/api';

type Perm = { id: string; key: string; name: string; group: string };
type Role = {
  id: string;
  slug: string;
  name: string;
  description: string;
  system: boolean;
  permissions: { permission: { key: string } }[];
};

export default function SuperAdminRoleEdit() {
  const params = useParams<{ id: string }>();
  const [role, setRole] = useState<Role | null>(null);
  const [perms, setPerms] = useState<Perm[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState('');

  useEffect(() => {
    Promise.all([
      fetch(`${API}/rbac/roles/${params.id}`, { credentials: 'include' }).then((r) =>
        r.ok ? (r.json() as Promise<Role>) : null,
      ),
      fetch(`${API}/rbac/permissions`, { credentials: 'include' }).then((r) => r.json()) as Promise<Perm[]>,
    ]).then(([current, catalog]) => {
      setRole(current);
      setPerms(catalog.filter((p) => p.key !== '*'));
      setSelected(new Set(current?.permissions.map((g) => g.permission.key).filter((k) => k !== '*') ?? []));
    });
  }, [params.id]);

  async function onSave(e: FormEvent) {
    e.preventDefault();
    if (!role) return;
    const res = await fetch(`${API}/rbac/roles/${role.id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(
        role.slug === 'super-admin'
          ? { name: role.name, description: role.description }
          : { name: role.name, description: role.description, permissionKeys: [...selected] },
      ),
    });
    setNotice(res.ok ? 'Saved. Users pick this up on their next request.' : 'Could not save (system super-admin is locked).');
  }

  if (!role) return <p>Loading…</p>;

  const groups = [...new Set(perms.map((p) => p.group))];

  return (
    <form onSubmit={onSave}>
      <h1 className="font-serif text-3xl">{role.name}</h1>
      <p className="text-sm text-ink/60">{role.slug}{role.system ? ' · system role' : ''}</p>
      {role.slug === 'super-admin' ? (
        <p className="mt-3 text-sm text-ink/70">Super-admin always has every permission (*). That grant cannot be edited.</p>
      ) : null}
      {notice ? <p className="mt-3 text-sm">{notice}</p> : null}
      <input
        className="mt-4 w-full max-w-md rounded-xl border px-3 py-2"
        value={role.name}
        onChange={(e) => setRole({ ...role, name: e.target.value })}
      />
      <textarea
        className="mt-3 w-full max-w-md rounded-xl border px-3 py-2"
        value={role.description}
        onChange={(e) => setRole({ ...role, description: e.target.value })}
      />
      {role.slug === 'super-admin' ? null : groups.map((group) => (
        <div key={group} className="mt-6">
          <h2 className="font-serif text-xl">{group}</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {perms
              .filter((p) => p.group === group)
              .map((p) => (
                <li key={p.key}>
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selected.has(p.key)}
                      disabled={role.slug === 'super-admin'}
                      onChange={() => {
                        const next = new Set(selected);
                        if (next.has(p.key)) next.delete(p.key);
                        else next.add(p.key);
                        setSelected(next);
                      }}
                    />
                    <span>
                      {p.name}
                      <span className="block text-ink/50">{p.key}</span>
                    </span>
                  </label>
                </li>
              ))}
          </ul>
        </div>
      ))}
      <button className="mt-6 rounded-full bg-ink px-4 py-2 text-cream" type="submit">
        {role.slug === 'super-admin' ? 'Save name' : 'Save permissions'}
      </button>
    </form>
  );
}
