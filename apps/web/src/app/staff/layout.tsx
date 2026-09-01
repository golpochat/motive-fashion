import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

const links = [
  { href: '/staff', label: 'Floor', perm: 'dashboard.staff' },
  { href: '/staff/pos', label: 'POS till', perm: 'pos.sale' },
  { href: '/staff/inventory', label: 'Inventory', perm: 'inventory.read' },
  { href: '/staff/orders', label: 'Orders', perm: 'orders.read' },
  { href: '/staff/locations', label: 'Locations', perm: 'locations.read' },
];

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allow="dashboard.staff">
      <DashboardShell title="Staff" links={links}>
        {children}
      </DashboardShell>
    </PermissionGate>
  );
}
