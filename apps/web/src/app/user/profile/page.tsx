'use client';

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Field, PrimaryButton, SecondaryButton, fieldClass } from '@/components/dashboard-ui';
import { PasswordField } from '@/components/password-field';
import { useSession, refreshSession } from '@/components/session-provider';

export default function UserProfile() {
  const { me } = useSession();
  if (!me) return null;

  return (
    <div>
      <PageHeader
        title="Profile"
        description="Account details on file. Support can update name and email if you write to us."
      />
      {me.mfaRequired ? (
        <p className="mb-4 rounded-2xl border border-ink/15 bg-white p-4 text-sm" role="status">
          Staff and admin sign-in needs an authenticator. Turn it on below before opening the till or admin console.
        </p>
      ) : null}
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
      <MfaPanel enabled={Boolean(me.mfaEnabled)} locked={Boolean(me.mfaLocked)} />
      <p className="mt-6 text-sm text-ink/70">
        Delivery addresses live under <Link href="/user/addresses">Addresses</Link>.
      </p>
    </div>
  );
}

function MfaPanel({ enabled, locked }: { enabled: boolean; locked: boolean }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  async function startSetup() {
    setError('');
    setNotice('');
    setBusy(true);
    const res = await fetch(`${API}/auth/mfa/setup`, { method: 'POST', credentials: 'include' });
    const payload = (await res.json().catch(() => null)) as { secret?: string; otpauth?: string; backupCodes?: string[]; message?: string } | null;
    setBusy(false);
    if (!res.ok || !payload?.secret || !payload.otpauth || !payload.backupCodes) {
      setError(apiErrorMessage(payload, 'Could not start authenticator setup.'));
      return;
    }
    setSetup({ secret: payload.secret, otpauth: payload.otpauth, backupCodes: payload.backupCodes });
  }

  async function enable(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/auth/mfa/enable`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'That code is not valid.'));
      return;
    }
    setSetup(null);
    setCode('');
    setNotice('Authenticator is on. Keep the backup codes somewhere safe.');
    await refreshSession();
  }

  async function disable(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/auth/mfa/disable`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password, code }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not turn the authenticator off.'));
      return;
    }
    setPassword('');
    setCode('');
    setNotice('Authenticator is off.');
    await refreshSession();
  }

  return (
    <section className="mt-8 max-w-lg rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-serif text-2xl">Authenticator</h2>
      <p className="mt-2 text-sm text-ink/70">
        {enabled
          ? locked
            ? 'Staff and admin accounts keep the authenticator on.'
            : 'Sign-in asks for a code from your authenticator app.'
          : 'Add a TOTP app such as Google Authenticator. We show the secret here — we do not send it to a public QR service.'}
      </p>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="mt-3 text-sm text-ink/80" role="status">
          {notice}
        </p>
      ) : null}

      {!enabled && !setup ? (
        <div className="mt-4">
          <PrimaryButton type="button" disabled={busy} onClick={() => void startSetup()}>
            {busy ? 'Starting…' : 'Set up authenticator'}
          </PrimaryButton>
        </div>
      ) : null}

      {setup ? (
        <form onSubmit={(e) => void enable(e)} className="mt-4 space-y-3">
          <p className="break-all font-mono text-xs">{setup.secret}</p>
          <p className="break-all text-xs text-ink/55">{setup.otpauth}</p>
          <div>
            <p className="text-xs uppercase tracking-wider text-ink/55">Backup codes</p>
            <ul className="mt-2 grid grid-cols-2 gap-2 font-mono text-sm">
              {setup.backupCodes.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink/55">Save these now. Each code works once.</p>
          </div>
          <Field label="Authenticator code">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={fieldClass} autoComplete="one-time-code" />
          </Field>
          <div className="flex flex-wrap gap-2">
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Saving…' : 'Turn on'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setSetup(null)}>
              Cancel
            </SecondaryButton>
          </div>
        </form>
      ) : null}

      {enabled && !locked ? (
        <form onSubmit={(e) => void disable(e)} className="mt-4 space-y-3">
          <PasswordField
            label="Password"
            autoComplete="current-password"
            value={password}
            onChange={setPassword}
            showRules={false}
          />
          <Field label="Authenticator or backup code">
            <input value={code} onChange={(e) => setCode(e.target.value)} className={fieldClass} autoComplete="one-time-code" />
          </Field>
          <SecondaryButton type="submit" disabled={busy}>
            {busy ? 'Turning off…' : 'Turn off authenticator'}
          </SecondaryButton>
        </form>
      ) : null}
    </section>
  );
}
