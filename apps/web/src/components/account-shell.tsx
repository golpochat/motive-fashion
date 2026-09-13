'use client';

import { DashboardShell } from '@/components/dashboard-shell';

export function AccountShell({ children }: { children: React.ReactNode }) {
  return <DashboardShell workspace="customer">{children}</DashboardShell>;
}
