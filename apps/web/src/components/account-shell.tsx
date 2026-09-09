'use client';

import { DashboardShell } from '@/components/dashboard-shell';
import { useSession } from '@/components/session-provider';
import { homeWorkspace } from '@/lib/workspaces';

export function AccountShell({ children }: { children: React.ReactNode }) {
  const { me } = useSession();
  return <DashboardShell workspace={homeWorkspace(me)}>{children}</DashboardShell>;
}
