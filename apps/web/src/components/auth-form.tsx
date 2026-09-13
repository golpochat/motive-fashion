'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { authHref, homePath, loginContext, safeNext, type Me } from '@/lib/rbac';
import { canAccessWorkspace } from '@/lib/workspaces';
import { PASSWORD_MIN_LENGTH } from '@motive-fashion/config';
import { fieldClass } from '@/components/dashboard-ui';
import { PasswordField } from '@/components/password-field';
import { useSession } from '@/components/session-provider';

export type AuthPage = 'login' | 'register' | 'forgot' | 'reset' | 'verify';
type Mode = 'login' | 'register' | 'forgot' | 'reset' | 'mfa' | 'check-email';

const labelClass = 'mb-1.5 block text-sm text-ink/70';

function destFor(me: Me) {
  const next = safeNext(new URLSearchParams(window.location.search).get('next'));
  if (!next) return homePath(me);
  if (next.startsWith('/super-admin')) return canAccessWorkspace(me, 'super-admin') ? next : homePath(me);
  if (next.startsWith('/admin')) return canAccessWorkspace(me, 'admin') ? next : homePath(me);
  if (next.startsWith('/staff')) return canAccessWorkspace(me, 'staff') ? next : homePath(me);
  if (next.startsWith('/user') && homePath(me) !== '/user') return homePath(me);
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
  if (message === 'Passwords do not match') {
    return 'The two passwords do not match.';
  }
  if (message.includes('Too many sign-in attempts')) {
    return 'Too many sign-in attempts. Try again later.';
  }
  if (message.includes('Verify your email')) {
    return 'Verify your email before signing in. Check your inbox, including junk.';
  }
  if (message.includes('verification link')) {
    return message;
  }
  if (message.includes('sign-in step expired')) {
    return 'This sign-in step expired. Sign in again.';
  }
  if (message === 'Validation failed') {
    return mode === 'register'
      ? `Check name, email, matching passwords of at least ${PASSWORD_MIN_LENGTH} characters.`
      : 'Enter a valid email and password.';
  }
  if (message.includes('reset link')) return message;
  if (mode === 'register') return 'Could not create the account. Try again.';
  if (mode === 'forgot') return 'Could not send a reset email. Try again.';
  if (mode === 'reset') return 'Could not update the password. Try again.';
  if (mode === 'mfa') return 'That code is not valid. Try again.';
  if (mode === 'check-email') return 'Could not send the verification email. Try again.';
  return 'Could not sign in. Try again.';
}

function readSearch() {
  return new URLSearchParams(window.location.search);
}

async function loadMeAndGo() {
  const meRes = await fetch(`${API}/account/me`, { credentials: 'include' });
  if (!meRes.ok) return false;
  const me = (await meRes.json()) as Me;
  window.location.replace(destFor(me));
  return true;
}

function initialNext() {
  if (typeof window === 'undefined') return null;
  return safeNext(readSearch().get('next'));
}

export function AuthForm({ page }: { page: AuthPage }) {
  const { me, loading } = useSession();
  const [mode, setMode] = useState<Mode>(page === 'verify' ? 'login' : page);
  const [checking, setChecking] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaToken, setMfaToken] = useState('');
  const [pendingEmail, setPendingEmail] = useState('');
  const [resetToken, setResetToken] = useState('');
  const [nextPath, setNextPath] = useState<string | null>(initialNext);
  const [fieldError, setFieldError] = useState<{
    name?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    consent?: string;
    mfa?: string;
  }>({});

  const context = useMemo(() => loginContext(nextPath), [nextPath]);
  const loginHref = authHref('/auth/login', nextPath);
  const registerHref = authHref('/auth/register', nextPath);
  const forgotHref = authHref('/auth/forgot', nextPath);

  useEffect(() => {
    const params = readSearch();
    setNextPath(safeNext(params.get('next')));
    if (page === 'reset') {
      setResetToken(params.get('reset') ?? '');
    }
    if (page !== 'verify') return;
    const verify = params.get('token') ?? params.get('verify') ?? '';
    if (!verify) {
      setError('This verification link is invalid or has expired.');
      setChecking(false);
      return;
    }
    void (async () => {
      const res = await fetch(`${API}/auth/verify-email`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verify }),
      });
      const payloadBody = (await res.json().catch(() => null)) as unknown;
      if (!res.ok) {
        setError(accountError('login', apiMessage(payloadBody)));
        setChecking(false);
        return;
      }
      const ok = await loadMeAndGo();
      if (!ok) {
        setError('Email verified. Sign in to continue.');
        setChecking(false);
      }
    })();
  }, [page]);

  useEffect(() => {
    if (page === 'verify') return;
    if (page === 'reset') {
      setChecking(false);
      return;
    }
    if (loading) return;
    if (me) {
      window.location.replace(destFor(me));
      return;
    }
    if (page === 'register' && !loginContext(nextPath).allowRegister) {
      window.location.replace(loginHref);
      return;
    }
    setChecking(false);
  }, [loading, loginHref, me, nextPath, page]);

  function switchToLogin() {
    setError('');
    setFieldError({});
    setPassword('');
    setConfirmPassword('');
    setMfaCode('');
    setSent(false);
    setMfaToken('');
    setMode('login');
  }

  function validate(form: FormData) {
    const next: typeof fieldError = {};
    const email = String(form.get('email') ?? '').trim();
    if (mode === 'register') {
      const name = String(form.get('name') ?? '').trim();
      if (name.length < 2) next.name = 'Enter the name we should use on your orders.';
    }
    if (mode !== 'reset' && mode !== 'mfa') {
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
    if (mode === 'register') {
      if (confirmPassword !== password) next.confirmPassword = 'The two passwords do not match.';
    }
    if (mode === 'mfa' && mfaCode.replace(/\s/g, '').length < 6) {
      next.mfa = 'Enter the 6-digit code from your authenticator, or a backup code.';
    }
    if (mode === 'register' && form.get('gdprConsent') !== 'on') {
      next.consent = 'Tick the box so we can use your details to fulfil orders.';
    }
    return next;
  }

  async function finishSession(fallback: string) {
    const ok = await loadMeAndGo();
    if (!ok) setError(fallback);
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
        const payloadBody = (await res.json().catch(() => null)) as Record<string, unknown> | null;
        if (!res.ok) {
          setError(accountError(mode, apiMessage(payloadBody)));
          return;
        }
        if (payloadBody?.needsVerification) {
          setPendingEmail(String(payloadBody.email ?? ''));
          setMode('check-email');
          return;
        }
        if (payloadBody?.mfaRequired && typeof payloadBody.mfaToken === 'string') {
          setMfaToken(payloadBody.mfaToken);
          setMode('mfa');
          return;
        }
        await finishSession('Password updated. Sign in to continue.');
        return;
      }
      if (mode === 'mfa') {
        const res = await fetch(`${API}/auth/mfa/verify`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mfaToken, code: mfaCode }),
        });
        const payloadBody = (await res.json().catch(() => null)) as unknown;
        if (!res.ok) {
          setError(accountError(mode, apiMessage(payloadBody)));
          return;
        }
        await finishSession('Signed in, but the session could not be loaded. Try again.');
        return;
      }
      if (mode === 'check-email') {
        const res = await fetch(`${API}/auth/resend-verification`, {
          method: 'POST',
          credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: pendingEmail }),
        });
        if (!res.ok) {
          const payloadBody = (await res.json().catch(() => null)) as unknown;
          setError(accountError(mode, apiMessage(payloadBody)));
          return;
        }
        setSent(true);
        return;
      }
      const path = mode === 'login' ? '/auth/login' : '/auth/register';
      const payload: Record<string, unknown> = {
        email: form.get('email'),
        password: form.get('password'),
      };
      if (mode === 'register') {
        payload.name = form.get('name');
        payload.confirmPassword = confirmPassword;
        payload.gdprConsent = form.get('gdprConsent') === 'on';
      }
      const res = await fetch(`${API}${path}`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const payloadBody = (await res.json().catch(() => null)) as Record<string, unknown> | null;
      if (!res.ok) {
        const message = apiMessage(payloadBody);
        if (res.status === 403 && message.includes('Verify your email')) {
          setPendingEmail(String(form.get('email') ?? ''));
          setMode('check-email');
          setError(accountError(mode, message));
          return;
        }
        setError(accountError(mode, message));
        return;
      }
      if (payloadBody?.needsVerification) {
        setPendingEmail(String(payloadBody.email ?? form.get('email') ?? ''));
        setMode('check-email');
        setSent(true);
        return;
      }
      if (payloadBody?.mfaRequired && typeof payloadBody.mfaToken === 'string') {
        setMfaToken(payloadBody.mfaToken);
        setMode('mfa');
        return;
      }
      await finishSession(
        mode === 'register'
          ? 'Account created, but the session could not be loaded. Sign in to continue.'
          : 'Signed in, but the session could not be loaded. Try again.',
      );
    } catch {
      setError(accountError(mode, ''));
    } finally {
      setBusy(false);
    }
  }

  if (checking) {
    return <p className="text-sm text-ink/70">Checking your session…</p>;
  }

  if (page === 'reset' && !resetToken) {
    return (
      <div className="space-y-4">
        <div>
          <h1 className="font-serif text-3xl">Reset link expired</h1>
          <p className="mt-2 text-sm text-ink/70">Request a new password reset. Links expire after one hour.</p>
        </div>
        <Link href={forgotHref} className="block min-h-11 text-sm underline">
          Forgot password?
        </Link>
        <Link href={loginHref} className="block min-h-11 text-sm underline">
          Back to sign in
        </Link>
      </div>
    );
  }

  const heading =
    mode === 'forgot'
      ? 'Reset password'
      : mode === 'reset'
        ? 'Choose a new password'
        : mode === 'register'
          ? 'Create account'
          : mode === 'mfa'
            ? 'Authenticator code'
            : mode === 'check-email'
              ? 'Check your email'
              : context.title;
  const intro =
    mode === 'forgot'
      ? 'Enter the email on the account. If we have it, we will send a reset link that expires in one hour.'
      : mode === 'reset'
        ? 'This link expires in one hour. After you save, you will be signed in.'
        : mode === 'register'
          ? 'Create an account to track orders, save addresses, and check out faster. We will email a verification link before you can sign in.'
          : mode === 'mfa'
            ? 'Enter the 6-digit code from your authenticator app, or a one-time backup code.'
            : mode === 'check-email'
              ? 'We sent a verification link. It expires in 24 hours. Check junk if you do not see it.'
              : context.copy;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4" aria-busy={busy}>
      <div>
        <h1 className="font-serif text-3xl">{heading}</h1>
        <p className="mt-2 text-sm text-ink/70">{intro}</p>
      </div>

      {mode === 'register' ? (
        <label className="block">
          <span className={labelClass}>Name</span>
          <input name="name" autoComplete="name" aria-invalid={Boolean(fieldError.name)} className={fieldClass} />
          {fieldError.name ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.name}
            </p>
          ) : null}
        </label>
      ) : null}

      {mode !== 'reset' && mode !== 'mfa' && mode !== 'check-email' ? (
        <label className="block">
          <span className={labelClass}>Email</span>
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
          accessory={
            mode === 'login' ? (
              <Link href={forgotHref} className="text-sm text-ink/55 no-underline hover:text-accent">
                Forgot password?
              </Link>
            ) : null
          }
        />
      ) : null}

      {mode === 'register' ? (
        <PasswordField
          name="confirmPassword"
          label="Confirm password"
          value={confirmPassword}
          onChange={(value) => {
            setConfirmPassword(value);
            if (fieldError.confirmPassword) setFieldError((prev) => ({ ...prev, confirmPassword: undefined }));
          }}
          autoComplete="new-password"
          error={fieldError.confirmPassword}
        />
      ) : null}

      {mode === 'mfa' ? (
        <label className="block">
          <span className={labelClass}>Code</span>
          <input
            value={mfaCode}
            onChange={(e) => setMfaCode(e.target.value)}
            inputMode="numeric"
            autoComplete="one-time-code"
            aria-invalid={Boolean(fieldError.mfa)}
            className={fieldClass}
          />
          {fieldError.mfa ? (
            <p className="mt-1.5 text-sm text-red-700" role="alert">
              {fieldError.mfa}
            </p>
          ) : null}
        </label>
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
          {mode === 'check-email'
            ? 'If that email is on file and still unverified, we sent a new link.'
            : 'If that email is on file, we sent a reset link. Check your inbox, including junk.'}
        </p>
      ) : null}

      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}

      {mode === 'forgot' && sent ? null : (
        <button
          className="min-h-11 w-full rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50"
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
                  : mode === 'mfa'
                    ? 'Checking code…'
                    : mode === 'check-email'
                      ? 'Sending link…'
                      : 'Updating password…'
            : mode === 'login'
              ? 'Sign in'
              : mode === 'register'
                ? 'Create account'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : mode === 'mfa'
                    ? 'Continue'
                    : mode === 'check-email'
                      ? 'Resend verification'
                      : 'Save password'}
        </button>
      )}

      {mode === 'login' ? (
        context.allowRegister ? (
          <p className="text-sm text-ink/70">
            Need an account?{' '}
            <Link href={registerHref} className="underline">
              Create one
            </Link>
          </p>
        ) : (
          <p className="text-sm text-ink/50">
            Staff and admin accounts are issued by Motive Fashion. They are not created here.
          </p>
        )
      ) : mode === 'mfa' || mode === 'check-email' ? (
        <button type="button" className="block min-h-11 text-sm underline" onClick={switchToLogin}>
          Back to sign in
        </button>
      ) : (
        <Link href={loginHref} className="block min-h-11 text-sm underline">
          Back to sign in
        </Link>
      )}
    </form>
  );
}
