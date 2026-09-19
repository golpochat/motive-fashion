'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API, apiErrorMessage } from '@/lib/api';
import { Field, PrimaryButton, fieldClass } from '@/components/dashboard-ui';

export function OrderFindForm({ defaultTicket = '' }: { defaultTicket?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [ticket, setTicket] = useState(defaultTicket);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    const res = await fetch(`${API}/orders/lookup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, ticket }),
    });
    const payload = (await res.json().catch(() => null)) as { id?: string; trackingToken?: string; message?: string } | null;
    setBusy(false);
    if (!res.ok || !payload?.id || !payload.trackingToken) {
      setError(apiErrorMessage(payload, 'No order matched that email and ticket.'));
      return;
    }
    router.push(`/order/${payload.id}?token=${encodeURIComponent(payload.trackingToken)}`);
  }

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="mt-6 space-y-4">
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <Field label="Order email">
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={fieldClass}
        />
      </Field>
      <Field label="Order number" hint="The ticket on your confirmation email, or the last part of your tracking link.">
        <input
          required
          value={ticket}
          onChange={(e) => setTicket(e.target.value)}
          className={fieldClass}
        />
      </Field>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Looking…' : 'Find my order'}
      </PrimaryButton>
    </form>
  );
}
