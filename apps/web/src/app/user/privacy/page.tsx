'use client';

import { useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { useSession } from '@/components/session-provider';

export default function UserPrivacy() {
  const { logout } = useSession();
  const [notice, setNotice] = useState('');

  return (
    <div>
      <PageHeader
        title="Privacy"
        description="Export a copy of your data, or delete the account. Order records are kept where Irish law requires."
      />
      {notice ? <p className="mb-4 text-sm">{notice}</p> : null}
      <div className="flex max-w-lg flex-col gap-3">
        <button
          type="button"
          className="rounded-full border border-ink/15 px-4 py-2 text-left text-sm hover:border-ink/40"
          onClick={async () => {
            const data = await fetch(`${API}/account/gdpr-export`, { credentials: 'include' }).then((r) => r.json());
            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'motive-fashion-data.json';
            a.click();
            URL.revokeObjectURL(url);
            setNotice('Export downloaded.');
          }}
        >
          Export my data
        </button>
        <button
          type="button"
          className="rounded-full border border-red-200 px-4 py-2 text-left text-sm text-red-800 hover:bg-red-50"
          onClick={async () => {
            if (!confirm('Delete your account? Orders are retained for legal records.')) return;
            await fetch(`${API}/account/gdpr-delete`, { method: 'POST', credentials: 'include' });
            setNotice('Account deleted.');
            await logout();
          }}
        >
          Delete account
        </button>
      </div>
    </div>
  );
}
