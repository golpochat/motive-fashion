'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { API } from '@/lib/api';
import { homePath, loginContext, safeNext, type Me } from '@/lib/rbac';
import { canAccessWorkspace } from '@/lib/workspaces';
import { PASSWORD_MIN_LENGTH } from '@motive-fashion/config';
import { fieldClass } from '@/components/dashboard-ui';
import { PasswordField } from '@/components/password-field';

type Mode = 'login' | 'register' | 'forgot' | 'reset';

function destFor(me: Me) {
  const next = safeNext(new URLSearchParams(window.location.search).get('next'));
  if (!next) return homePath(me);
  if (next.startsWith('/super-admin')) return canAccessWorkspace(me, 'super-admin') ? next : homePath(me);
  if (next.startsWith('/admin')) return canAccessWorkspace(me, 'admin') ? next : homePath(me);
  if (next.startsWith('/staff')) return canAccessWorkspace(me, 'staff') ? next : homePath(me);
  if ((next === '/user' || next === '/user/') && homePath(me) !== '/user') return homePath(me);
  return next;
}

function apiMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('message' in payload)) return '';
  const message = (payload as { message?: unknown }).message;
  if (typeof message === 'string') return message;
  if (Array.isArray(message) && typeof message[0] === 'string') return message[0];
  return '';
}

function accountError(mode: Mode, message: string) {
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
  if (message.includes('reset link')) return message;
  if (mode === 'register') return 'Could not create the account. Try again.';
  if (mode === 'forgot') return 'Could not send a reset email. Try again.';
  if (mode === 'reset') return 'Could not update the password. Try again.';
  return 'Could not sign in. Try again.';
}

function readSearch() {
  return new URLSearchParams(window.location.search);
}

export default function AccountPage() {
  const [mode, setMode] = useState<Mode>('login');
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [nextPath, setNextPath] = useState<string | null>(null);
  const [fieldError, setFieldError] = useState<{ name?: string; email?: string; password?: string; consent?: string }>(
    {},
  );

  const context = useMemo(() => loginContext(nextPath), [nextPath]);

  useEffect(() => {
    const params = readSearch();
    const next = safeNext(params.get('next'));
    setNextPath(next);
    const token = params.get('reset') ?? '';
    if (token) {
      setResetToken(token);
      setMode('reset');
    } else if (params.get('mode') === 'forgot') {
      setMode('forgot');
    } else if (params.get('mode') === 'register' && loginContext(next).allowRegister) {
      setMode('register');
    } else {
      setMode('login');
    }
    fetch(`${API}/account/me`, { credentials: 'include' })
      .then((res) => (res.ok ? res.json() : null))
      .then((user: Me | null) => {
        if (user && !token) {
          window.location.replace(destFor(user));
          return;
        }
        setChecking(false);
      })
      .catch(() => setChecking(false));
  }, []);

  function writeQuery(nextMode: Mode) {
    const params = readSearch();
    params.delete('reset');
    if (nextMode === 'register') params.set('mode', 'register');
    else if (nextMode === 'forgot') params.set('mode', 'forgot');
    else params.delete('mode');
    const query = params.toString();
    window.history.replaceState(null, '', query ? `/account?${query}` : '/account');
  }

  function switchMode(next: Mode) {
    setError('');
    setFieldError({});
    setPassword('');
    setSent(false);
    writeQuery(next);
    setMode(next);
  }

  function validate(form: FormData) {
    const next: { name?: string; email?: string; password?: string; consent?: string } = {};
    const email = String(form.get('email') ?? '').trim();
    if (mode === 'register') {
      const name = String(form.get('name') ?? '').trim();
      if (name.length < 2) next.name = 'Enter the name we should use on your orders.';
    }
    if (mode !== 'reset') {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        next.email = 'Enter a valid email, like name@example.com.';
      }
    }
    if (mode === 'login' || mode === 'register' || mode === 'reset') {
      if (!password) {
        next.password =
          mode === 'login' ? 'Enter your password.' : 'Choose a password to protect this account.';
      } else if (mode !== 'login' && password.length < PASSWORD_MIN_LENGTH) {
        next.password = `Use at least ${PASSWORD_MIN_LENGTH} characters. You currently have ${password.length}.`;
      }
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
    try {
      if (mode === 'forgot') {
        const res = await fetch(`${API}/auth/forgot-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: form.get('email'), next: nextPath || undefined }),
        });
        if (!res.ok) {
          const payloadBody = (await res.json().catch(() => null)) as unknown;
          setError(accountError(mode, apiMessage(payloadBody)));
          return;
        }
        setSent(true);
        return;
      }
      if (mode === 'reset') {
        const res = await fetch(`${API}/auth/reset-password`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const payloadBody = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          setError(accountError(mode, apiMessage(payloadBody)));
          return;
        }
        const meRes = await fetch(`${API}/account/me`, { credentials: 'include' });
        if (!meRes.ok) {
          setError('Password updated. Sign in to continue.');
          return;
        }
        const me = (await meRes.json()) as Me;
        window.location.replace(destFor(me));
        return;
      }
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
      setError(accountError(mode, ''));
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <p className="mx-auto max-w-md text-sm text-ink/70">Checking your session…</p>;
  }

  const heading =
    mode === 'forgot' ? 'Reset password' : mode === 'reset' ? 'Choose a new password' : mode === 'register' ? 'Create account' : context.title;
  const intro =
    mode === 'forgot'
      ? 'Enter the email on the account. If we have it, we will send a reset link that expires in one hour.'
      : mode === 'reset'
        ? 'This link expires in one hour. After you save, you will be signed in.'
        : mode === 'register'
          ? 'Create an account to track orders, save addresses, and check out faster.'
          : context.copy;

  return (
    <form onSubmit={onSubmit} noValidate className="mx-auto max-w-md space-y-4" aria-busy={busy}>
      <div>
        <h1 className="font-serif text-4xl">{heading}</h1>
        <p className="mt-2 text-sm text-ink/70">{intro}</p>
      </div>

      {mode === 'register' ? (
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Name</span>
          <input name="name" autoComplete="name" aria-invalid={Boolean(fieldError.name)} className={fieldClass} />
          {fieldError.name ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.name}
            </p>
          ) : null}
        </label>
      ) : null}

      {mode !== 'reset' ? (
        <label className="block">
          <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Email</span>
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
      ) : null}

      {mode === 'login' || mode === 'register' || mode === 'reset' ? (
        <PasswordField
          value={password}
          onChange={(value) => {
            setPassword(value);
            if (fieldError.password) setFieldError((prev) => ({ ...prev, password: undefined }));
          }}
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          showRules={mode !== 'login'}
          error={fieldError.password}
        />
      ) : null}

      {mode === 'register' ? (
        <div>
          <label className="flex items-start gap-2 text-sm text-ink/70">
            <input name="gdprConsent" type="checkbox" className="mt-1 accent-ink" />
            <span>
              I agree to the processing of my account data to fulfil orders. See{' '}
              <a href="/legal/privacy">Privacy</a> and <a href="/legal/terms">Terms</a>.
            </span>
          </label>
          {fieldError.consent ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.consent}
            </p>
          ) : null}
        </div>
      ) : null}

      {sent ? (
        <p className="text-sm text-ink/80" role="status">
          If that email is on file, we sent a reset link. Check your inbox, including junk.
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {mode === 'forgot' && sent ? null : (
        <button
          className="w-full rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50"
          type="submit"
          disabled={busy}
        >
          {busy
            ? mode === 'login'
              ? 'Signing in…'
              : mode === 'register'
                ? 'Creating account…'
                : mode === 'forgot'
                  ? 'Sending link…'
                  : 'Updating password…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : 'Save password'}
        </button>
      )}

      {mode === 'login' ? (
        <div className="space-y-2">
          <button type="button" className="block text-sm underline" onClick={() => switchMode('forgot')}>
            Forgot password?
          </button>
          {context.allowRegister ? (
            <button type="button" className="block text-sm underline" onClick={() => switchMode('register')}>
              Need an account?
            </button>
          ) : (
            <p className="text-xs text-ink/50">Staff and admin accounts are issued by Motive Fashion. They are not created here.</p>
          )}
        </div>
      ) : (
        <button type="button" className="block text-sm underline" onClick={() => switchMode('login')}>
          Back to sign in
        </button>
      )}
    </form>
  );
}
