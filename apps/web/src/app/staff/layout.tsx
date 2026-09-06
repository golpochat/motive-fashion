import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allow="dashboard.staff">
      <DashboardShell workspace="staff">{children}</DashboardShell>
    </PermissionGate>
  );
}
