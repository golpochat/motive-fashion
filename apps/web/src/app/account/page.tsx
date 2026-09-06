'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { homePath, safeNext, type Me } from '@/lib/rbac';
import { canAccessWorkspace } from '@/lib/workspaces';
import { PASSWORD_MIN_LENGTH } from '@motive-fashion/config';
import { fieldClass } from '@/components/dashboard-ui';
import { PasswordField } from '@/components/password-field';

function destFor(me: Me) {
  const next = safeNext(new URLSearchParams(window.location.search).get('next'));
  if (!next) return homePath(me);
  if (next.startsWith('/super-admin')) return canAccessWorkspace(me, 'super-admin') ? next : homePath(me);
  if (next.startsWith('/admin')) return canAccessWorkspace(me, 'admin') ? next : homePath(me);
  if (next.startsWith('/staff')) return canAccessWorkspace(me, 'staff') ? next : homePath(me);
  return next;
}

function apiMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return '';
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return '';
}

function accountError(mode: 'login' | 'register', message: string) {
  if (message === 'Email already registered') {
    return 'An account already exists for this email. Sign in instead.';
  }
  if (message === 'Consent is required') {
    return 'Please confirm we may use your details to fulfil orders.';
  }
  if (message === 'Invalid credentials') {
    return 'Email or password is not recognised.';
  }
  if (message === 'Validation failed') {
    return mode === 'register'
      ? `Check name, email, and that the password is at least ${PASSWORD_MIN_LENGTH} characters.`
      : 'Enter a valid email and password.';
  }
  return mode === 'register' ? 'Could not create the account. Try again.' : 'Could not sign in. Try again.';
}

export default function AccountPage() {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [fieldError, setFieldError] = useState<{ name?: string; email?: string; password?: string; consent?: string }>(
    {},
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('mode') === 'register') {
      setMode('register');
    }
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

  function switchMode(next: 'login' | 'register') {
    const params = new URLSearchParams(window.location.search);
    if (next === 'register') params.set('mode', 'register');
    else params.delete('mode');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/account?${query}` : '/account');
    setError('');
    setFieldError({});
    setPassword('');
    setMode(next);
  }

  function validate(form: FormData) {
    const next: { name?: string; email?: string; password?: string; consent?: string } = {};
    const email = String(form.get('email') ?? '').trim();
    if (mode === 'register') {
      const name = String(form.get('name') ?? '').trim();
      if (name.length < 2) next.name = 'Enter the name we should use on your orders.';
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      next.email = 'Enter a valid email, like name@example.com.';
    }
    if (!password) {
      next.password = mode === 'register' ? 'Choose a password to protect this account.' : 'Enter your password.';
    } else if (mode === 'register' && password.length < PASSWORD_MIN_LENGTH) {
      next.password = `Use at least ${PASSWORD_MIN_LENGTH} characters. You currently have ${password.length}.`;
    }
    if (mode === 'register' && form.get('gdprConsent') !== 'on') {
      next.consent = 'Tick the box so we can use your details to fulfil orders.';
    }
    return next;
  }

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    const form = new FormData(e.currentTarget);
    const local = validate(form);
    setFieldError(local);
    if (Object.keys(local).length) return;
    setBusy(true);
    const path = mode === 'login' ? '/auth/login' : '/auth/register';
    const payload: Record<string, unknown> = {
      email: form.get('email'),
      password: form.get('password'),
    };
    if (mode === 'register') {
      payload.name = form.get('name');
      payload.gdprConsent = form.get('gdprConsent') === 'on';
    }
    try {
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const payloadBody = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(accountError(mode, apiMessage(payloadBody)));
        return;
      }
      const meRes = await fetch(`${API}/account/me`, { credentials: 'include' });
      if (!meRes.ok) {
        setError(
          mode === 'register'
            ? 'Account created, but the session could not be loaded. Sign in to continue.'
            : 'Signed in, but the session could not be loaded. Try again.',
        );
        return;
      }
      const me = (await meRes.json()) as Me;
      window.location.replace(destFor(me));
    } catch {
      setError(mode === 'register' ? 'Could not create the account. Try again.' : 'Could not sign in. Try again.');
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <p className="mx-auto max-w-md text-sm text-ink/70">Checking your session…</p>;
  }

  const existing = error.includes('already exists');

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-md space-y-4" aria-busy={busy}>
      <div>
        <h1 className="font-serif text-4xl">{mode === 'login' ? 'Sign in' : 'Create account'}</h1>
        <p className="mt-2 text-sm text-ink/70">
          {mode === 'login'
            ? 'Use the email and password for this Motive Fashion account.'
            : 'Create an account to track orders, save addresses, and check out faster.'}
        </p>
      </div>

      {mode === 'register' ? (
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/50">Name</span>
          <input name="name" autoComplete="name" aria-invalid={Boolean(fieldError.name)} className={fieldClass} />
          {fieldError.name ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.name}
            </p>
          ) : null}
        </label>
      ) : null}

      <label className="block">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/50">Email</span>
        <input
          name="email"
          type="email"
          autoComplete="email"
          aria-invalid={Boolean(fieldError.email)}
          className={fieldClass}
        />
        {fieldError.email ? (
          <p className="mt-1.5 text-sm text-red-700" role="alert">
            {fieldError.email}
          </p>
        ) : null}
      </label>

      <PasswordField
        value={password}
        onChange={(value) => {
          setPassword(value);
          if (fieldError.password) setFieldError((prev) => ({ ...prev, password: undefined }));
        }}
        autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
        showRules={mode === 'register'}
        error={fieldError.password}
      />

      {mode === 'register' ? (
        <div>
          <label className="flex items-start gap-2 text-sm text-ink/80">
            <input name="gdprConsent" type="checkbox" className="mt-1 accent-ink" />
            I agree to the processing of my account data to fulfil orders.
          </label>
          {fieldError.consent ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.consent}
            </p>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      <button
        className="rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50"
        type="submit"
        disabled={busy}
      >
        {busy
          ? mode === 'login'
            ? 'Signing in…'
            : 'Creating account…'
          : mode === 'login'
            ? 'Sign in'
            : 'Create account'}
      </button>

      {existing ? (
        <button type="button" className="block text-sm underline" onClick={() => switchMode('login')}>
          Sign in instead
        </button>
      ) : (
        <button type="button" className="block text-sm underline" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}>
          {mode === 'login' ? 'Need an account?' : 'Already registered?'}
        </button>
      )}
    </form>
  );
}
