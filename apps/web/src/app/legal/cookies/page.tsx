import { BRAND } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Cookies',
  'How Motive Fashion uses essential cookies for cart and login, and optional analytics cookies if you accept them.',
);

export default function CookiesPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Cookies</h1>
      <p className="text-ink/70">
        Essential cookies keep your cart (`mf_session`, `mf_cart`) and signed-in session (`mf_access`, `mf_refresh`).
        They are required to shop. We set them as HttpOnly where they hold tokens.
      </p>
      <p className="text-ink/70">
        On the banner you can Accept optional cookies, keep Essential only, or Reject optional cookies. Analytics and
        marketing cookies stay off unless you accept them. Rejecting non-essential cookies does not stop checkout.
      </p>
      <p className="text-ink/70">
        See <a href="/legal/privacy">Privacy</a> for what we store on the server.
      </p>
      <p className="text-xs text-ink/55">Controller: {BRAND.legalName}, {BRAND.city}.</p>
    </article>
  );
}
