import { AuthGate } from '@/components/permission-gate';
import { AccountShell } from '@/components/account-shell';

export default function UserLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <AccountShell>{children}</AccountShell>
    </AuthGate>
  );
}
