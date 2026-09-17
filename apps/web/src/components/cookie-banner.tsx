'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { COOKIE_POLICY_VERSION } from '@motive-fashion/config';
import { API } from '@/lib/api';
import { cartSessionKey } from '@/lib/api';

type Choice = 'all' | 'essential' | 'rejected';

export function CookieBanner() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    const stored = localStorage.getItem('mf_cookies');
    const version = localStorage.getItem('mf_cookies_version');
    if (!stored || version !== COOKIE_POLICY_VERSION) setOn(true);
  }, []);
  if (!on) return null;

  function choose(value: Choice) {
    localStorage.setItem('mf_cookies', value);
    localStorage.setItem('mf_cookies_version', COOKIE_POLICY_VERSION);
    setOn(false);
    void fetch(`${API}/consent`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        choice: value,
        version: COOKIE_POLICY_VERSION,
        sessionKey: cartSessionKey(),
      }),
    }).catch(() => null);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-ink/10 bg-surface p-4">
      <p className="text-sm text-ink/70">
        Essential cookies keep your cart and login working. Optional cookies (analytics) stay off until you accept them.{' '}
        <Link href="/legal/cookies">Cookie details</Link>
        <span className="mt-1 block text-xs text-ink/45">Policy {COOKIE_POLICY_VERSION}</span>
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-full bg-primary px-4 py-2.5 text-sm text-cream" onClick={() => choose('all')}>
          Accept
        </button>
        <button
          type="button"
          className="min-h-11 rounded-full border border-ink/20 px-4 py-2.5 text-sm"
          onClick={() => choose('essential')}
        >
          Essential only
        </button>
        <button type="button" className="min-h-11 rounded-full border border-ink/20 px-4 py-2.5 text-sm" onClick={() => choose('rejected')}>
          Reject
        </button>
      </div>
    </div>
  );
}
