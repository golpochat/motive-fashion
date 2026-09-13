import { AuthGate } from '@/components/permission-gate';
import { AccountShell } from '@/components/account-shell';
import { WorkHomeRedirect } from '@/components/work-home-redirect';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta('Account', 'Orders, wishlist, profile, addresses, and privacy.');

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <WorkHomeRedirect>
        <AccountShell>{children}</AccountShell>
      </WorkHomeRedirect>
    </AuthGate>
  );
}
