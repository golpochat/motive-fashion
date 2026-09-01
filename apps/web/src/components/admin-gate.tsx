'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<{ role?: string }>;
      })
      .then((me) => {
        if (me?.role === 'STAFF' || me?.role === 'ADMIN') {
          setAllowed(true);
          return;
        }
        window.location.replace('/account');
      })
      .catch(() => {
        window.location.replace('/account');
      });
  }, []);

  if (!allowed) {
    return <p>Checking staff access…</p>;
  }
  return children;
}
