'use client';

import { FormEvent, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { Field, fieldClass } from '@/components/dashboard-ui';
import { BRAND } from '@motive-fashion/config';

export function ContactForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    try {
      const res = await fetch(`${API}/contact`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.get('name'),
          email: data.get('email'),
          phone: String(data.get('phone') || '') || undefined,
          message: data.get('message'),
          company: data.get('company'),
        }),
      });
      const payload = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(apiErrorMessage(payload, 'Could not send the message. Try email instead.'));
        return;
      }
      setSent(true);
      form.reset();
    } catch {
      setError('Could not send the message. Email us instead.');
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <p className="rounded-2xl border border-ink/10 bg-white p-5 text-sm text-ink/70" role="status">
        Message received. We reply on Irish working days, typically within one business day, to the email you gave.
      </p>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
      <p className="hidden" aria-hidden="true">
        <label>
          Company
          <input name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </p>
      <Field label="Name">
        <input name="name" required autoComplete="name" className={fieldClass} />
      </Field>
      <Field label="Email">
        <input name="email" type="email" required autoComplete="email" className={fieldClass} />
      </Field>
      <Field label="Phone">
        <input name="phone" autoComplete="tel" className={fieldClass} />
        <span className="mt-1.5 block text-xs text-ink/55">Optional.</span>
      </Field>
      <Field label="Message">
        <textarea name="message" required rows={5} minLength={10} className={fieldClass} />
      </Field>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button type="submit" disabled={busy} className="rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50">
        {busy ? 'Sending…' : 'Send message'}
      </button>
      <p className="text-xs text-ink/55">
        Or email <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
      </p>
    </form>
  );
}
