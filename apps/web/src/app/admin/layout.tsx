import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allow="dashboard.admin">
      <DashboardShell workspace="admin">{children}</DashboardShell>
    </PermissionGate>
  );
}
