'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { hasPerm, homePath, type Me } from '@/lib/rbac';

export function HeaderAccount() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then(setMe);
  }, []);

  const consoleHref =
    me && (hasPerm(me, 'rbac.roles.write') || hasPerm(me, 'dashboard.admin') || hasPerm(me, 'dashboard.staff'))
      ? homePath(me)
      : null;

  return (
    <>
      {consoleHref ? (
        <Link href={consoleHref} className="no-underline hover:underline">
          Console
        </Link>
      ) : null}
      <Link href={me ? '/user' : '/account'} className="no-underline hover:underline">
        Account
      </Link>
    </>
  );
}
