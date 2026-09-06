'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

export function CookieBanner() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    if (!localStorage.getItem('mf_cookies')) setOn(true);
  }, []);
  if (!on) return null;
  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-ink/10 bg-surface p-4">
      <p className="text-sm">We use essential cookies for cart and login. Non-essential cookies are off unless you accept them later.</p>
      <div className="mt-3 flex gap-3 text-sm">
        <button
          type="button"
          className="rounded-full bg-primary px-4 py-1 text-cream"
          onClick={() => {
            localStorage.setItem('mf_cookies', 'essential');
            setOn(false);
          }}
        >
          Essential only
        </button>
        <button
          type="button"
          className="rounded-full border border-ink/20 px-4 py-1"
          onClick={() => {
            localStorage.setItem('mf_cookies', 'rejected');
            setOn(false);
          }}
        >
          Reject
        </button>
        <Link href="/legal/cookies">Details</Link>
      </div>
    </div>
  );
}
