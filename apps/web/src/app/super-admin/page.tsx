'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';

type RoleRow = {
  id: string;
  slug: string;
  name: string;
  system: boolean;
  _count: { members: number };
  permissions: { permission: { key: string } }[];
};

export default function SuperAdminRoles() {
  const [roles, setRoles] = useState<RoleRow[]>([]);
  const [error, setError] = useState('');

  function reload() {
    fetch(`${API}/rbac/roles`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRoles);
  }

  useEffect(() => {
    reload();
  }, []);

  async function onCreate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/rbac/roles`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name')),
        slug: String(form.get('slug')),
        description: String(form.get('description') || ''),
        permissionKeys: [],
      }),
    });
    if (!res.ok) {
      setError('Could not create role. Slug must be unique and not a system slug.');
      return;
    }
    const created = await res.json();
    window.location.assign(`/super-admin/roles/${created.id}`);
  }

  async function onDelete(id: string) {
    if (!confirm('Delete this role? Members keep other roles, or fall back to customer.')) return;
    await fetch(`${API}/rbac/roles/${id}`, { method: 'DELETE', credentials: 'include' });
    reload();
  }

  return (
    <div>
      <h1 className="font-serif text-3xl">Roles</h1>
      <p className="mt-2 text-sm text-ink/70">
        Permissions are a fixed catalog. Roles are yours to create. Tick permissions on a role, then assign the role to
        users.
      </p>
      {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
      <form onSubmit={onCreate} className="mt-6 max-w-md space-y-3">
        <input name="name" required placeholder="Role name" className="w-full rounded-xl border px-3 py-2" />
        <input name="slug" required placeholder="slug-like-this" className="w-full rounded-xl border px-3 py-2" />
        <input name="description" placeholder="Description" className="w-full rounded-xl border px-3 py-2" />
        <button className="rounded-full bg-ink px-4 py-2 text-cream" type="submit">
          Create role
        </button>
      </form>
      <ul className="mt-8 space-y-3 text-sm">
        {roles.map((r) => (
          <li key={r.id} className="flex items-center justify-between border-b py-2">
            <span>
              <Link href={`/super-admin/roles/${r.id}`} className="font-medium">
                {r.name}
              </Link>
              <span className="text-ink/50">
                {' '}
                · {r.slug}
                {r.system ? ' · system' : ''} · {r._count.members} people · {r.permissions.length} perms
              </span>
            </span>
            {r.system ? null : (
              <button type="button" className="rounded-full border px-3 py-1" onClick={() => onDelete(r.id)}>
                Delete
              </button>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
