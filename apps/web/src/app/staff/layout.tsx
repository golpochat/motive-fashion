import { WorkspaceGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Staff', 'Till, your sales, and stock on the Dublin shop floor.');

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceGate workspace="staff">
      <DashboardShell workspace="staff">{children}</DashboardShell>
    </WorkspaceGate>
  );
}
