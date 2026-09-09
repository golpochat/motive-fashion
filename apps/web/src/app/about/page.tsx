import { BRAND } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'About',
  `${BRAND.name} is a Dublin house for premium modest wear — hijabs, abayas, jilbabs, and prayer sets.`,
);

export default function AboutPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">About Motive Fashion</h1>
      <p className="text-ink/70">
        Motive Fashion is a Dublin house for premium modest wear — hijabs, abayas, jilbabs, khimars, prayer sets, and
        the small pieces that make a scarf stay put.
      </p>
      <p className="text-ink/70">
        We buy from specialist workshops in Turkey, the Gulf, Pakistan, Indonesia, and China, then sell in Ireland with
        VAT-inclusive prices. Web, WhatsApp, the till, and the app share one stock ledger, so a piece reserved online is
        not sold twice at the counter.
      </p>
      <p className="text-ink/70">
        Collection is in Dublin. Delivery is Ireland only for launch. Photography is for drape and coverage, not
        trend-chasing.
      </p>
      <p className="text-ink/70">
        Questions: <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> or <a href="/contact">contact</a>.
      </p>
    </article>
  );
}
