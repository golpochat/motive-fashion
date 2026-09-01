import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

const links = [
  { href: '/super-admin', label: 'Roles', perm: 'rbac.roles.write' },
  { href: '/super-admin/users', label: 'Users', perm: 'rbac.users.assign' },
];

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allow="rbac.roles.write">
      <DashboardShell title="Super-admin" links={links}>
        {children}
      </DashboardShell>
    </PermissionGate>
  );
}
