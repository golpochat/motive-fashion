'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { initials, roleLabel } from '@/lib/rbac';
import { accessibleWorkspaces } from '@/lib/workspaces';
import { mfaSetupPath } from '@motive-fashion/utils';
import { useSession } from '@/components/session-provider';

const menuLinkClass = 'block px-3 py-2 text-sm no-underline hover:bg-ink/5';

export function ProfileMenu({ variant = 'storefront' }: { variant?: 'storefront' | 'console' }) {
  const { me, loading, logout } = useSession();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  // Guests have no session cookie to hint at login, so `loading` is always true
  // on refresh. An avatar skeleton looks signed-in; keep Sign in until `me` arrives.
  if (!me) {
    if (loading && variant === 'console') {
      return <span className="h-9 w-9 rounded-full bg-ink/10" aria-hidden />;
    }
    if (pathname.startsWith('/auth')) {
      return (
        <span className="inline-flex min-h-11 items-center text-sm text-accent" aria-current="page">
          Sign in
        </span>
      );
    }
    return (
      <Link href="/auth/login" className="inline-flex min-h-11 items-center text-sm no-underline transition-colors hover:text-accent">
        Sign in
      </Link>
    );
  }

  const home = accessibleWorkspaces(me)[0];
  const onConsole = variant === 'console';
  const dashboardLabel = home?.id === 'customer' ? 'My account' : home?.label;

  return (
    <div className="relative" ref={root}>
      <button
        type="button"
        className={
          variant === 'console'
            ? 'flex items-center gap-2 rounded-full border border-ink/10 bg-white py-1 pl-1 pr-2 text-left md:pr-3'
            : 'flex items-center gap-2 rounded-full border border-ink/10 py-1 pl-1 pr-2 text-left md:pr-3'
        }
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-[11px] font-medium text-cream">
          {initials(me)}
        </span>
        <span className="hidden max-w-[9rem] truncate text-sm md:inline">{me.name}</span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-64 overflow-hidden rounded-xl border border-ink/10 bg-white shadow-lg"
        >
          <div className="border-b border-ink/10 px-3 py-3">
            <p className="truncate text-sm font-medium">{me.name}</p>
            <p className="truncate text-xs text-ink/55">{me.email}</p>
            <p className="mt-1 text-xs text-ink/45">{roleLabel(me)}</p>
          </div>
          <div className="border-b border-ink/10 py-1">
            <p className="px-3 pb-1 pt-2 text-[11px] font-medium text-ink/40">Links</p>
            {home && !onConsole ? (
              <Link href={home.href} role="menuitem" className={menuLinkClass} onClick={() => setOpen(false)}>
                {dashboardLabel}
              </Link>
            ) : null}
            {home && home.id !== 'customer' && !onConsole ? (
              <Link
                href={mfaSetupPath(me.permissions)}
                role="menuitem"
                className={menuLinkClass}
                onClick={() => setOpen(false)}
              >
                Security
              </Link>
            ) : null}
            {onConsole ? (
              <Link href="/" role="menuitem" className={menuLinkClass} onClick={() => setOpen(false)}>
                Storefront
              </Link>
            ) : null}
          </div>
          <div className="p-2">
            <button
              type="button"
              role="menuitem"
              className="w-full rounded-lg bg-primary px-3 py-2 text-sm text-cream"
              onClick={() => void logout()}
            >
              Sign out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
