'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { hasPerm, type Me } from '@/lib/rbac';

type NavLink = { href: string; label: string; perm?: string };

export function DashboardShell({
  title,
  links,
  children,
}: {
  title: string;
  links: NavLink[];
  children: React.ReactNode;
}) {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe);
  }, []);

  const consoles = [
    hasPerm(me, 'rbac.roles.write') ? { href: '/super-admin', label: 'Super-admin' } : null,
    hasPerm(me, 'dashboard.admin') ? { href: '/admin', label: 'Admin' } : null,
    hasPerm(me, 'dashboard.staff') ? { href: '/staff', label: 'Staff' } : null,
    { href: '/user', label: 'Account' },
  ].filter(Boolean) as { href: string; label: string }[];

  return (
    <div className="grid gap-8 md:grid-cols-[200px_1fr]">
      <aside className="flex flex-col gap-2 text-sm">
        <p className="font-serif text-lg">{title}</p>
        <div className="mb-4 flex flex-col gap-1 text-xs uppercase tracking-widest text-ink/50">
          {consoles.map((c) => (
            <Link key={c.href} href={c.href} className="no-underline hover:underline">
              {c.label}
            </Link>
          ))}
        </div>
        {links
          .filter((l) => !l.perm || hasPerm(me, l.perm))
          .map((l) => (
            <Link key={l.href} href={l.href} className="no-underline hover:underline">
              {l.label}
            </Link>
          ))}
      </aside>
      <div>{children}</div>
    </div>
  );
}
