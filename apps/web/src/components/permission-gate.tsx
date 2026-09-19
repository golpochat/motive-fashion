'use client';

import { useEffect } from 'react';
import { authHref, hasAnyPerm, homePath } from '@/lib/rbac';
import { canAccessWorkspace, type WorkspaceId } from '@/lib/workspaces';
import { useSession } from '@/components/session-provider';

function GateMessage({ label }: { label: string }) {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-ink/70">{label}</p>
    </div>
  );
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const { me, loading } = useSession();

  useEffect(() => {
    if (!loading && !me) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(authHref('/auth/login', next));
    }
  }, [loading, me]);

  if (loading) return <GateMessage label="Checking session…" />;
  if (!me) return <GateMessage label="Redirecting to sign in…" />;
  return children;
}

export function PermissionGate({
  allow,
  allowAny,
  children,
}: {
  allow?: string;
  allowAny?: string[];
  children: React.ReactNode;
}) {
  const { me, loading } = useSession();
  const needed = allowAny ?? (allow ? [allow] : []);
  const allowed = Boolean(me && (needed.length === 0 || hasAnyPerm(me, needed)));

  useEffect(() => {
    if (loading) return;
    if (!me) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(authHref('/auth/login', next));
      return;
    }
    if (!allowed) {
      window.location.replace(homePath(me));
    }
  }, [allowed, loading, me]);

  if (loading) return <GateMessage label="Checking access…" />;
  if (!me || !allowed) return <GateMessage label="Redirecting…" />;
  return children;
}

export function WorkspaceGate({
  workspace,
  children,
}: {
  workspace: WorkspaceId;
  children: React.ReactNode;
}) {
  const { me, loading } = useSession();
  const allowed = Boolean(me && canAccessWorkspace(me, workspace));

  useEffect(() => {
    if (loading) return;
    if (!me) {
      const next = `${window.location.pathname}${window.location.search}`;
      window.location.replace(authHref('/auth/login', next));
      return;
    }
    if (!allowed) {
      window.location.replace(homePath(me));
    }
  }, [allowed, loading, me]);

  if (loading) return <GateMessage label="Checking access…" />;
  if (!me || !allowed) return <GateMessage label="Redirecting…" />;
  return children;
}
