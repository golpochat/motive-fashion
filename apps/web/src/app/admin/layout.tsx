import { WorkspaceGate } from '@/components/permission-gate';
import { DashboardShell } from '@/components/dashboard-shell';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Admin', 'Merchandising, customers, supply, and marketing for Motive Fashion.');

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <WorkspaceGate workspace="admin">
      <DashboardShell workspace="admin">{children}</DashboardShell>
    </WorkspaceGate>
  );
}
