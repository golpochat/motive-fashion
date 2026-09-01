'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { hasPerm, homePath, type Me } from '@/lib/rbac';

export function AuthGate({ children }: { children: React.ReactNode }) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<Me>;
      })
      .then((user) => {
        if (!user) {
          window.location.replace('/account');
          return;
        }
        setMe(user);
      })
      .catch(() => {
        window.location.replace('/account');
      });
  }, []);

  if (!me) return <p>Checking access…</p>;
  return children;
}

export function PermissionGate({
  allow,
  children,
}: {
  allow: string;
  children: React.ReactNode;
}) {
  const [me, setMe] = useState<Me | null | undefined>(undefined);

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) return null;
        return res.json() as Promise<Me>;
      })
      .then((user) => {
        if (!user || !hasPerm(user, allow)) {
          window.location.replace(user ? homePath(user) : '/account');
          return;
        }
        setMe(user);
      })
      .catch(() => {
        window.location.replace('/account');
      });
  }, [allow]);

  if (!me) return <p>Checking access…</p>;
  return children;
}
