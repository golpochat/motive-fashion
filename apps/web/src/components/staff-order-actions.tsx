'use client';

import { useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { Field, Modal, PrimaryButton, SecondaryButton, fieldClass } from '@/components/dashboard-ui';

export function StaffOrderActions({
  orderId,
  email,
}: {
  orderId: string;
  email?: string | null;
}) {
  const [busy, setBusy] = useState<'print' | 'email' | ''>('');
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [emailOpen, setEmailOpen] = useState(false);
  const [to, setTo] = useState(email ?? '');

  async function reprint() {
    setError('');
    setNote('');
    setBusy('print');
    const res = await fetch(`${API}/staff/orders/${orderId}/print`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const payload = (await res.json()) as { message?: string; printed?: boolean; error?: string };
    setBusy('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not reprint this ticket'));
      return;
    }
    setNote(payload.printed ? 'Ticket sent to the till printer.' : payload.error || 'Printer did not accept the ticket.');
  }

  async function sendEmail() {
    setError('');
    setNote('');
    setBusy('email');
    const res = await fetch(`${API}/staff/orders/${orderId}/email`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: to.trim() || undefined }),
    });
    const payload = (await res.json()) as { message?: string; sent?: boolean; email?: string; skipped?: boolean };
    setBusy('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not email this receipt'));
      return;
    }
    setEmailOpen(false);
    if (payload.skipped) {
      setNote('Mail is not configured on this till. Receipt was not sent.');
      return;
    }
    setNote(`Receipt emailed to ${payload.email}.`);
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap gap-2">
        <SecondaryButton type="button" disabled={Boolean(busy)} onClick={() => void reprint()}>
          {busy === 'print' ? 'Printing…' : 'Reprint'}
        </SecondaryButton>
        <SecondaryButton
          type="button"
          disabled={Boolean(busy)}
          onClick={() => {
            setTo(email ?? '');
            setEmailOpen(true);
          }}
        >
          Email receipt
        </SecondaryButton>
      </div>
      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {note ? <p className="text-xs text-ink/55">{note}</p> : null}
      {emailOpen ? (
        <Modal title="Email receipt" onClose={() => setEmailOpen(false)}>
          <Field label="Customer email">
            <input
              className={fieldClass}
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="customer@email.com"
              autoComplete="email"
            />
          </Field>
          <div className="mt-4 flex gap-2">
            <PrimaryButton type="button" disabled={busy === 'email' || to.trim().length < 5} onClick={() => void sendEmail()}>
              {busy === 'email' ? 'Sending…' : 'Send'}
            </PrimaryButton>
            <SecondaryButton type="button" onClick={() => setEmailOpen(false)}>
              Cancel
            </SecondaryButton>
          </div>
        </Modal>
      ) : null}
    </div>
  );
}
