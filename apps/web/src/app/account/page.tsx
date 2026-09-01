'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { hasPerm, homePath, safeNext, type Me } from '@/lib/rbac';

function destFor(me: Me) {
  const next = safeNext(new URLSearchParams(window.location.search).get('next'));
  if (next) {
    if (next.startsWith('/super-admin') && hasPerm(me, 'rbac.roles.write')) return next;
    if (next.startsWith('/admin') && hasPerm(me, 'dashboard.admin')) return next;
    if (next.startsWith('/staff') && hasPerm(me, 'dashboard.staff')) return next;
    if (next.startsWith('/user')) return next;
  }
  return homePath(me);
}

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [checking, setChecking] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((user: Me | null) => {
        if (user) {
          window.location.replace(destFor(user));
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload: Record<string, unknown> = {
      email: form.get('email'),
      password: form.get('password'),
    };
    if (mode === 'register') {
      payload.name = form.get('name');
      payload.gdprConsent = form.get('gdprConsent') === 'on';
    }
    const res = await fetch(`${API}${path}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      setError('Could not sign in. Check details and try again.');
      return;
    }
    const meRes = await fetch(`${API}/account/me`, { credentials: 'include' });
    if (!meRes.ok) {
      setError('Signed in, but the session could not be loaded.');
      return;
    }
    const me = (await meRes.json()) as Me;
    window.location.replace(destFor(me));
  }

  if (checking) return <p>Checking session…</p>;

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-md space-y-3">
      <h1 className="font-serif text-4xl">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
      {mode === 'register' ? (
        <input name="name" required placeholder="Name" className="w-full rounded-xl border px-3 py-2" />
      ) : null}
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-3 py-2" />
      <input
        name="password"
        type="password"
        required
        minLength={10}
        placeholder="Password"
        className="w-full rounded-xl border px-3 py-2"
      />
      {mode === 'register' ? (
        <label className="flex items-start gap-2 text-sm">
          <input name="gdprConsent" type="checkbox" required className="mt-1" />
          I agree to the processing of my account data to fulfil orders.
        </label>
      ) : null}
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-full bg-ink px-6 py-2 text-cream" type="submit">
        Continue
      </button>
      <button type="button" className="block text-sm underline" onClick={() => setMode(mode === 'login' ? 'register' : 'login')}>
        {mode === 'login' ? 'Need an account?' : 'Already registered?'}
      </button>
    </form>
  );
}
