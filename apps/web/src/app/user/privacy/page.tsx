'use client';

import { useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Modal, SecondaryButton } from '@/components/dashboard-ui';
import { useSession } from '@/components/session-provider';

export default function UserPrivacy() {
  const { logout } = useSession();
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  return (
    <div>
      <PageHeader
        title="Privacy"
        description="Export a copy of your data, or delete the account. Order records are kept where Irish law requires."
      />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mb-4 text-sm text-ink/80" role="status">
          {notice}
        </p>
      ) : null}
      <div className="flex max-w-lg flex-col gap-3">
        <SecondaryButton
          type="button"
          disabled={busy === 'export'}
          onClick={async () => {
            setError('');
            setNotice('');
            setBusy('export');
            const res = await fetch(`${API}/account/gdpr-export`, { credentials: 'include' });
            const data = await res.json().catch(() => null);
            setBusy('');
            if (!res.ok) {
              setError(apiErrorMessage(data, 'Could not export your data.'));
              return;
            }
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
          {busy === 'export' ? 'Exporting…' : 'Export my data'}
        </SecondaryButton>
        <SecondaryButton type="button" disabled={busy === 'delete'} onClick={() => setConfirmDelete(true)}>
          Delete account
        </SecondaryButton>
      </div>
      {confirmDelete ? (
        <Modal title="Delete this account?" onClose={() => setConfirmDelete(false)}>
          <p className="text-sm text-ink/70">
            Orders stay on file where Irish law requires. Wishlist, addresses, and sign-in will be removed.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            <SecondaryButton
              type="button"
              disabled={busy === 'delete'}
              onClick={async () => {
                setError('');
                setNotice('');
                setBusy('delete');
                const res = await fetch(`${API}/account/gdpr-delete`, { method: 'POST', credentials: 'include' });
                const payload = await res.json().catch(() => null);
                setBusy('');
                if (!res.ok) {
                  setConfirmDelete(false);
                  setError(apiErrorMessage(payload, 'Could not delete this account.'));
                  return;
                }
                setNotice('Account deleted.');
                await logout();
              }}
            >
              {busy === 'delete' ? 'Deleting…' : 'Delete account'}
            </SecondaryButton>
            <SecondaryButton type="button" onClick={() => setConfirmDelete(false)}>
              Keep account
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
