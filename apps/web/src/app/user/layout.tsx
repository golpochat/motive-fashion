import { AuthGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <DashboardShell workspace="customer">{children}</DashboardShell>
    </AuthGate>
  );
}
