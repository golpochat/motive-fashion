'use client';

import { PageHeader } from '@/components/page-header';
import { MfaPanel } from '@/components/mfa-panel';
import { useSession } from '@/components/session-provider';

export function ConsoleSecurity() {
  const { me } = useSession();
  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="Security"
        description="Authenticator for this workspace. Staff and admin sign-in needs it before the till or console."
      />
      {me.mfaRequired && !me.mfaEnabled ? (
        <p className="mb-4 rounded-2xl border border-ink/15 bg-white p-4 text-sm" role="status">
          This workspace needs an authenticator. Turn it on below.
        </p>
      ) : null}
      <MfaPanel enabled={Boolean(me.mfaEnabled)} locked={Boolean(me.mfaLocked)} />
    </div>
  );
}
