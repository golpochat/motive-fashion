import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Access', 'Roles, people, and permissions for Motive Fashion.');

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allowAny={['dashboard.super', 'rbac.roles.write']}>
      <DashboardShell workspace="super-admin">{children}</DashboardShell>
    </PermissionGate>
  );
}
