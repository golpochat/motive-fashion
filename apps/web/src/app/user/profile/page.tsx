'use client';

import Link from 'next/link';
import { PageHeader } from '@/components/page-header';
import { useSession } from '@/components/session-provider';

export default function UserProfile() {
  const { me } = useSession();
  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Account details on file. Support can update name and email if you write to us."
      />
      <dl className="max-w-lg space-y-4 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-widest text-ink/45">Name</dt>
          <dd className="mt-1">{me.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-ink/45">Email</dt>
          <dd className="mt-1">{me.email}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-widest text-ink/45">Phone</dt>
          <dd className="mt-1">{me.phone || 'Not set'}</dd>
        </div>
      </dl>
      <p className="mt-6 text-sm text-ink/60">
        Delivery addresses live under{' '}
        <Link href="/user/addresses">Addresses</Link>.
      </p>
    </div>
  );
}
