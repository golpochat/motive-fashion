'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';

type Perm = { id: string; key: string; name: string; group: string };

export default function SuperAdminPermissions() {
  const [perms, setPerms] = useState<Perm[]>([]);

  useEffect(() => {
    fetch(`${API}/rbac/permissions`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPerms);
  }, []);

  const groups = [...new Set(perms.map((p) => p.group))];

  return (
    <div>
      <PageHeader
        title="Permission catalog"
        description="These keys are code-defined. Super-admins attach them to roles; they are not created from this screen."
      />
      {groups.map((group) => (
        <section key={group} className="mb-8 rounded-2xl border border-ink/10 bg-white p-5">
          <h2 className="font-serif text-xl">{group}</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {perms
              .filter((p) => p.group === group)
              .map((p) => (
                <li key={p.id} className="flex flex-col border-b border-ink/5 py-2 last:border-0 sm:flex-row sm:items-baseline sm:justify-between">
                  <span>{p.name}</span>
                  <code className="text-xs text-ink/50">{p.key}</code>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
