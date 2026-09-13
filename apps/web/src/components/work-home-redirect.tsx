'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { homePath } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

export function WorkHomeRedirect({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();
  const router = useRouter();
  const home = me ? homePath(me) : '/user';
  const bounce = Boolean(me && home !== '/user');

  useEffect(() => {
    if (bounce) router.replace(home);
  }, [bounce, home, router]);

  if (loading) {
    return <p className="p-8 text-sm text-ink/70">Checking session…</p>;
  }
  if (bounce) {
    return <p className="p-8 text-sm text-ink/70">Opening your workspace…</p>;
  }
  return children;
}
