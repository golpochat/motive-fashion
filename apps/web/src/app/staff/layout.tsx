import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allowAny={['dashboard.staff', 'pos.sale']}>
      <DashboardShell workspace="staff">{children}</DashboardShell>
    </PermissionGate>
  );
}
