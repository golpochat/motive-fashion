import { PermissionGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

const links = [
  { href: '/admin', label: 'Analytics', perm: 'analytics.read' },
  { href: '/admin/products', label: 'Products', perm: 'catalog.read' },
  { href: '/admin/customers', label: 'Customers', perm: 'customers.read' },
  { href: '/admin/suppliers', label: 'Suppliers', perm: 'procurement.write' },
  { href: '/admin/procurement', label: 'Procurement', perm: 'procurement.write' },
  { href: '/admin/whatsapp', label: 'WhatsApp', perm: 'whatsapp.broadcast' },
  { href: '/admin/marketing', label: 'Marketing', perm: 'marketing.write' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PermissionGate allow="dashboard.admin">
      <DashboardShell title="Admin" links={links}>
        {children}
      </DashboardShell>
    </PermissionGate>
  );
}
