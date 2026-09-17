'use client';

import { FormEvent, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { API, apiErrorMessage } from '@/lib/api';
import { authHref } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';
import { fieldClass, PrimaryButton } from '@/components/dashboard-ui';
import { RatingInput, RatingStars } from '@/components/rating-stars';

type Review = { rating: number; body: string; name: string; createdAt?: string };

type Eligibility = {
  purchased: boolean;
  alreadyReviewed: boolean;
  reviewStatus: 'PENDING' | 'APPROVED' | 'REJECTED' | null;
  eligible: boolean;
};

export function ProductReviews({
  productId,
  reviews,
}: {
  productId: string;
  reviews: Review[];
}) {
  const { me, loading: sessionLoading } = useSession();
  const pathname = usePathname();
  const [eligibility, setEligibility] = useState<Eligibility | null>(null);
  const [eligibilityError, setEligibilityError] = useState('');
  const [eligibilityLoading, setEligibilityLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);

  const loadEligibility = useCallback(async (quiet = false) => {
    if (!quiet) setEligibilityLoading(true);
    setEligibilityError('');
    try {
      const res = await fetch(`${API}/account/reviews/eligibility?productId=${encodeURIComponent(productId)}`, {
        credentials: 'include',
      });
      const payload = await res.json().catch(() => null);
      if (!res.ok) {
        setEligibility(null);
        setEligibilityError(apiErrorMessage(payload, 'Could not check whether you can review this piece.'));
        return;
      }
      setEligibility(payload as Eligibility);
    } catch {
      setEligibility(null);
      setEligibilityError('Could not check whether you can review this piece.');
    } finally {
      if (!quiet) setEligibilityLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    if (sessionLoading) return;
    if (!me) {
      setEligibility(null);
      setEligibilityError('');
      setEligibilityLoading(false);
      return;
    }
    void loadEligibility();
  }, [loadEligibility, me, sessionLoading]);

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    setNotice('');
    const form = e.currentTarget;
    const data = new FormData(form);
    setBusy(true);
    const res = await fetch(`${API}/account/reviews`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        productId,
        rating: Number(data.get('rating')),
        body: String(data.get('body') ?? ''),
      }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not send this review. You can review a piece you received and still have.'));
      return;
    }
    form.reset();
    setNotice('Thanks. We publish reviews after a short check.');
    setEligibility({ purchased: true, alreadyReviewed: true, reviewStatus: 'PENDING', eligible: false });
    await loadEligibility(true);
  }

  return (
    <section id="reviews" className="mt-12 border-t border-ink/10 pt-8">
      <h2 className="font-serif text-2xl">Reviews</h2>
      {reviews.length === 0 ? (
        <p className="mt-3 text-sm text-ink/70">No published reviews yet.</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {reviews.map((review, index) => (
            <li key={`${review.name}-${index}`} className="rounded-2xl border border-ink/10 bg-white p-4 text-sm">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <p className="font-medium">{review.name}</p>
                <RatingStars value={review.rating} size="sm" />
              </div>
              <p className="mt-2 text-ink/70">{review.body}</p>
            </li>
          ))}
        </ul>
      )}
      <ReviewComposer
        eligibility={eligibility}
        eligibilityError={eligibilityError}
        loading={sessionLoading || Boolean(me && eligibilityLoading)}
        signedIn={Boolean(me)}
        signInHref={authHref('/auth/login', pathname)}
        error={error}
        notice={notice}
        busy={busy}
        onSubmit={(event) => void submit(event)}
      />
    </section>
  );
}

function ReviewComposer({
  eligibility,
  eligibilityError,
  loading,
  signedIn,
  signInHref,
  error,
  notice,
  busy,
  onSubmit,
}: {
  eligibility: Eligibility | null;
  eligibilityError: string;
  loading: boolean;
  signedIn: boolean;
  signInHref: string;
  error: string;
  notice: string;
  busy: boolean;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
}) {
  if (loading) {
    return (
      <p className="mt-4 text-sm text-ink/70" aria-busy="true">
        Checking whether you can review this piece…
      </p>
    );
  }

  if (!signedIn) {
    return (
      <p className="mt-4 text-sm text-ink/70">
        Available after this piece is delivered or collected, if you still have it.{' '}
        <Link href={signInHref}>Sign in</Link> to leave a review from this account.
      </p>
    );
  }

  if (eligibilityError) {
    return (
      <p className="mt-4 text-sm text-red-700" role="alert">
        {eligibilityError}
      </p>
    );
  }

  if (!eligibility?.eligible) {
    return <p className="mt-4 text-sm text-ink/70">{ineligibleCopy(eligibility)}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="mt-6 max-w-lg space-y-3">
      <p className="text-sm text-ink/70">Write a review of this piece. We publish reviews after a short check.</p>
      {error ? (
        <p className="text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? (
        <p className="text-sm text-moss" role="status">
          {notice}
        </p>
      ) : null}
      <RatingInput name="rating" defaultValue={5} />
      <label className="block text-sm">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Review</span>
        <textarea name="body" required minLength={10} rows={4} className={fieldClass} />
      </label>
      <PrimaryButton type="submit" disabled={busy}>
        {busy ? 'Sending…' : 'Submit review'}
      </PrimaryButton>
    </form>
  );
}

function ineligibleCopy(eligibility: Eligibility | null) {
  if (eligibility?.reviewStatus === 'PENDING') {
    return 'Thanks. We publish reviews after a short check.';
  }
  if (eligibility?.reviewStatus === 'APPROVED') {
    return 'You have already reviewed this piece.';
  }
  if (eligibility?.reviewStatus === 'REJECTED') {
    return 'This review was not published.';
  }
  if (eligibility && !eligibility.purchased) {
    return 'You can review a piece you received and still have. Refunded or returned pieces cannot be reviewed.';
  }
  return 'Available after this piece is delivered or collected.';
}
