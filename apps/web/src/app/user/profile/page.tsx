'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  Modal,
  PrimaryButton,
  SecondaryButton,
  Td,
  Toggle,
  fieldClass,
} from '@/components/dashboard-ui';
import { useSession, refreshSession } from '@/components/session-provider';

export default function UserProfile() {
  const { me } = useSession();
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  if (!me) return null;

  async function save(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/account/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: String(form.get('name') || ''),
        phone: String(form.get('phone') || '').trim() || null,
        marketingOptIn: form.get('marketingOptIn') === 'on',
        whatsappOptIn: form.get('whatsappOptIn') === 'on',
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not save your profile.'));
      return;
    }
    setEditing(false);
    setNotice('Saved.');
    await refreshSession();
  }

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Name, phone, and how we may write to you. Email stays on the account for orders."
        actions={
          <PrimaryButton
            type="button"
            onClick={() => {
              setError('');
              setNotice('');
              setEditing(true);
            }}
          >
            Edit profile
          </PrimaryButton>
        }
      />
      {notice ? (
        <p className="mb-4 text-sm text-ink/80" role="status">
          {notice}
        </p>
      ) : null}
      <DataTable headers={['Field', 'Value']}>
        <tr className="hover:bg-ink/5">
          <Td muted>Name</Td>
          <Td>{me.name}</Td>
        </tr>
        <tr className="hover:bg-ink/5">
          <Td muted>Email</Td>
          <Td>
            {me.email}
            <span className="mt-1 block text-xs text-ink/45">Used for order receipts. Write to support to change it.</span>
          </Td>
        </tr>
        <tr className="hover:bg-ink/5">
          <Td muted>Phone</Td>
          <Td>{me.phone?.trim() ? me.phone : '—'}</Td>
        </tr>
        <tr className="hover:bg-ink/5">
          <Td muted>Email updates</Td>
          <Td>{me.marketingOptIn ? 'On' : 'Off'}</Td>
        </tr>
        <tr className="hover:bg-ink/5">
          <Td muted>WhatsApp</Td>
          <Td>{me.whatsappOptIn ? 'On' : 'Off'}</Td>
        </tr>
      </DataTable>
      {editing ? (
        <Modal title="Edit profile" onClose={() => setEditing(false)}>
          {error ? (
            <p className="mb-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
          <ProfileEditor
            name={me.name}
            email={me.email}
            phone={me.phone ?? ''}
            marketingOptIn={Boolean(me.marketingOptIn)}
            whatsappOptIn={Boolean(me.whatsappOptIn)}
            busy={busy}
            onSubmit={(e) => void save(e)}
            onCancel={() => setEditing(false)}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function ProfileEditor({
  name,
  email,
  phone,
  marketingOptIn,
  whatsappOptIn,
  busy,
  onSubmit,
  onCancel,
}: {
  name: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
  busy: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const [emailOpt, setEmailOpt] = useState(marketingOptIn);
  const [waOpt, setWaOpt] = useState(whatsappOptIn);

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <Field label="Name">
        <input name="name" defaultValue={name} className={fieldClass} required />
      </Field>
      <Field label="Email" hint="Used for order receipts. Change it by writing to support.">
        <input value={email} className={fieldClass} disabled />
      </Field>
      <Field label="Phone">
        <input name="phone" defaultValue={phone} className={fieldClass} />
      </Field>
      <Toggle name="marketingOptIn" checked={emailOpt} onChange={setEmailOpt} label="Email me about edits and restocks" />
      <Toggle name="whatsappOptIn" checked={waOpt} onChange={setWaOpt} label="WhatsApp order updates and the shop bot" />
      <div className="flex flex-wrap gap-2">
        <PrimaryButton type="submit" disabled={busy}>
          {busy ? 'Saving…' : 'Save profile'}
        </PrimaryButton>
        <SecondaryButton type="button" onClick={onCancel}>
          Cancel
        </SecondaryButton>
      </div>
    </form>
  );
}
