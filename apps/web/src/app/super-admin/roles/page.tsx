'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Field, Panel, PrimaryButton, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';

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
      <PageHeader
        title="Roles"
        description="Permissions are a fixed catalog. Create roles, tick permissions, then assign roles to people."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,22rem)_1fr]">
        <Panel title="New role">
          <form onSubmit={onCreate} className="space-y-3">
            <Field label="Name">
              <input name="name" required className={fieldClass} />
            </Field>
            <Field label="Slug">
              <input name="slug" required placeholder="slug-like-this" className={fieldClass} />
            </Field>
            <Field label="Description">
              <input name="description" className={fieldClass} />
            </Field>
            <PrimaryButton type="submit">Create role</PrimaryButton>
          </form>
        </Panel>
        <DataTable headers={['Role', 'Slug', 'People', 'Perms', 'Action']}>
          {roles.map((r) => (
            <tr key={r.id} className="hover:bg-ink/[0.02]">
              <Td>
                <Link href={`/super-admin/roles/${r.id}`} className="font-medium">
                  {r.name}
                </Link>
                {r.system ? <span className="ml-2 text-xs text-ink/45">system</span> : null}
              </Td>
              <Td muted>{r.slug}</Td>
              <Td>{r._count.members}</Td>
              <Td>{r.permissions.length}</Td>
              <Td>
                {r.system ? null : (
                  <SecondaryButton type="button" onClick={() => onDelete(r.id)}>
                    Delete
                  </SecondaryButton>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </div>
    </div>
  );
}
