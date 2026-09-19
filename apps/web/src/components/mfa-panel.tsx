'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { DataTable, Field, IconButton, Modal, PrimaryButton, RowActions, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';
import { PasswordField } from '@/components/password-field';
import { refreshSession } from '@/components/session-provider';

export function MfaPanel({ enabled, locked }: { enabled: boolean; locked: boolean }) {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ secret: string; otpauth: string; backupCodes: string[] } | null>(null);
  const [disableOpen, setDisableOpen] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');

  async function startSetup() {
    setError('');
    setNotice('');
    setBusy(true);
    const res = await fetch(`${API}/auth/mfa/setup`, { method: 'POST', credentials: 'include' });
    const payload = (await res.json().catch(() => null)) as {
      secret?: string;
      otpauth?: string;
      backupCodes?: string[];
      message?: string;
    } | null;
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
    setDisableOpen(false);
    setPassword('');
    setCode('');
    setNotice('Authenticator is off.');
    await refreshSession();
  }

  return (
    <section className="mt-8">
      <h2 className="mb-3 font-serif text-2xl [[data-theme=admin]_&]:font-sans [[data-theme=super-admin]_&]:font-sans [[data-theme=staff]_&]:font-sans">
        Authenticator
      </h2>
      <p className="mb-4 text-sm text-ink/70">
        {enabled
          ? locked
            ? 'This workspace keeps the authenticator on.'
            : 'Sign-in asks for a code from your authenticator app.'
          : 'Add a TOTP app such as Google Authenticator. We show the secret here — we do not send it to a public QR service.'}
      </p>
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
      <DataTable headers={['Setting', 'Status', 'Action']}>
        <tr className="hover:bg-ink/5">
          <Td>Authenticator</Td>
          <Td muted>{enabled ? (locked ? 'On · required' : 'On') : 'Off'}</Td>
          <Td nowrap>
            <RowActions>
              {!enabled ? (
                <IconButton
                  label="Set up authenticator"
                  icon="plus"
                  disabled={busy}
                  onClick={() => void startSetup()}
                />
              ) : locked ? null : (
                <IconButton
                  label="Turn off authenticator"
                  icon="trash"
                  tone="danger"
                  onClick={() => {
                    setError('');
                    setCode('');
                    setPassword('');
                    setDisableOpen(true);
                  }}
                />
              )}
            </RowActions>
          </Td>
        </tr>
      </DataTable>

      {setup ? (
        <Modal title="Set up authenticator" onClose={() => setSetup(null)}>
          <form onSubmit={(e) => void enable(e)} className="space-y-3">
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
            <div className="mt-2 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Saving…' : 'Turn on'}
              </PrimaryButton>
              <SecondaryButton type="button" onClick={() => setSetup(null)}>
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}

      {disableOpen ? (
        <Modal
          title="Turn off authenticator?"
          onClose={() => {
            setDisableOpen(false);
            setPassword('');
            setCode('');
          }}
        >
          <form onSubmit={(e) => void disable(e)} className="space-y-3">
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
            <div className="mt-2 flex flex-wrap gap-2">
              <PrimaryButton type="submit" disabled={busy}>
                {busy ? 'Turning off…' : 'Turn off'}
              </PrimaryButton>
              <SecondaryButton
                type="button"
                onClick={() => {
                  setDisableOpen(false);
                  setPassword('');
                  setCode('');
                }}
              >
                Cancel
              </SecondaryButton>
            </div>
          </form>
        </Modal>
      ) : null}
    </section>
  );
}
