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
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-xl rounded-2xl border border-ink/10 bg-cream p-4 shadow-lg">
      <p className="text-sm">We use essential cookies for cart and login. See our cookie notice.</p>
      <div className="mt-3 flex gap-3 text-sm">
        <button
          type="button"
          className="rounded-full bg-ink px-4 py-1 text-cream"
          onClick={() => {
            localStorage.setItem('mf_cookies', 'essential');
            setOn(false);
          }}
        >
          OK
        </button>
        <Link href="/legal/cookies">Details</Link>
      </div>
    </div>
  );
}
