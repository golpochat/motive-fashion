'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Field, PrimaryButton, Toggle, fieldClass } from '@/components/dashboard-ui';
import { useSession, refreshSession } from '@/components/session-provider';

export default function UserProfile() {
  const { me } = useSession();
  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Name, phone, and how we may write to you. Email stays on the account for orders."
      />
      <ProfileForm
        name={me.name}
        email={me.email}
        phone={me.phone ?? ''}
        marketingOptIn={Boolean(me.marketingOptIn)}
        whatsappOptIn={Boolean(me.whatsappOptIn)}
      />
      <p className="mt-6 text-sm text-ink/70">
        Delivery addresses live under <Link href="/user/addresses">Addresses</Link>.
      </p>
    </div>
  );
}

function ProfileForm({
  name,
  email,
  phone,
  marketingOptIn,
  whatsappOptIn,
}: {
  name: string;
  email: string;
  phone: string;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
}) {
  const [fullName, setFullName] = useState(name);
  const [mobile, setMobile] = useState(phone);
  const [emailOpt, setEmailOpt] = useState(marketingOptIn);
  const [waOpt, setWaOpt] = useState(whatsappOptIn);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const res = await fetch(`${API}/account/me`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: fullName,
        phone: mobile.trim() || null,
        marketingOptIn: emailOpt,
        whatsappOptIn: waOpt,
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not save your profile.'));
      return;
    }
    setNotice('Saved.');
    await refreshSession();
  }

  return (
    <form onSubmit={(e) => void save(e)} className="max-w-lg space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-ink/80" role="status">
          {notice}
        </p>
      ) : null}
      <Field label="Name">
        <input value={fullName} onChange={(e) => setFullName(e.target.value)} className={fieldClass} required />
      </Field>
      <Field label="Email" hint="Used for order receipts. Change it by writing to support.">
        <input value={email} className={fieldClass} disabled />
      </Field>
      <Field label="Phone">
        <input value={mobile} onChange={(e) => setMobile(e.target.value)} className={fieldClass} />
      </Field>
      <Toggle checked={emailOpt} onChange={setEmailOpt} label="Email me about edits and restocks" />
      <Toggle checked={waOpt} onChange={setWaOpt} label="WhatsApp order updates and the shop bot" />
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Saving…' : 'Save profile'}
      </PrimaryButton>
    </form>
  );
}
