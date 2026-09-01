import { AuthGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

const links = [{ href: '/user', label: 'Orders & privacy' }];

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <DashboardShell title="Account" links={links}>
        {children}
      </DashboardShell>
    </AuthGate>
  );
}
