'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { Field, Panel, PrimaryButton, fieldClass } from '@/components/dashboard-ui';

export default function AdminWhatsapp() {
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const res = await fetch(`${API}/admin/whatsapp/broadcast`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: String(form.get('message')) }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Broadcast failed. Admin only, and the number must be opted in.'));
      return;
    }
    setNotice('Queued to opted-in numbers only.');
    e.currentTarget.reset();
  }

  return (
    <div>
      <PageHeader title="WhatsApp" description="Broadcasts go only to opted-in numbers. Customers can write in plain language — hijabs, a colour, or a piece name. Old CAT: and ADD: codes still work." />
      <div className="max-w-lg">
        <Panel title="Broadcast">
          <form onSubmit={(e) => void onSubmit(e)} className="space-y-3">
            {error ? (
              <p className="text-sm text-red-700" role="alert">
                {error}
              </p>
            ) : null}
            {notice ? (
              <p className="text-sm text-moss" role="status">
                {notice}
              </p>
            ) : null}
            <Field label="Message">
              <textarea name="message" required className={fieldClass} rows={5} />
            </Field>
            <PrimaryButton type="submit" disabled={busy}>
              {busy ? 'Sending…' : 'Send broadcast'}
            </PrimaryButton>
          </form>
        </Panel>
      </div>
    </div>
  );
}
