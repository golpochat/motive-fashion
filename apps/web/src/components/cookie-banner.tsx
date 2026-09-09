'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

type Choice = 'all' | 'essential' | 'rejected';

export function CookieBanner() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('mf_cookies')) setOn(true);
  }, []);
  if (!on) return null;

  function choose(value: Choice) {
    localStorage.setItem('mf_cookies', value);
    setOn(false);
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-40 mx-auto max-w-xl rounded-2xl border border-ink/10 bg-surface p-4 shadow-lg">
      <p className="text-sm text-ink/70">
        Essential cookies keep your cart and login working. Optional cookies (analytics) stay off until you accept them.{' '}
        <Link href="/legal/cookies">Cookie details</Link>
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
