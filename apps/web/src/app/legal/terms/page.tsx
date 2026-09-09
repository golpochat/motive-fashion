import { BRAND } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Terms',
  `Purchase terms for ${BRAND.name}, Dublin. Irish and EU consumer law. VAT-inclusive euro prices.`,
);

export default function TermsPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Terms</h1>
      <p className="text-ink/70">
        These terms apply to purchases from Motive Fashion, Dublin, Ireland, on the website, app, WhatsApp, and in-shop
        till. Distance contracts follow Irish and EU consumer law. Prices are in euro and include VAT.
      </p>
      <p className="text-ink/70">
        A contract forms when payment succeeds (or when a till sale is posted). Stock is reserved at add-to-cart for{' '}
        {BRAND.reservationMinutes} minutes. If payment does not complete, the reservation is released.
      </p>
      <p className="text-ink/70">
        You have {BRAND.returnDays} days from delivery or collection to withdraw, except sealed goods opened for hygiene
        where the seal is broken. Change of mind after dispatch: we refund the items; you pay return postage to us.
        Cancel before we ship: full refund. Faulty goods: we cover the return. See <a href="/legal/returns">Returns</a>.
      </p>
      <p className="text-ink/70">Ireland delivery and Dublin collection only at launch. We may refuse an order if stock cannot be fulfilled.</p>
      <p className="text-ink/70">Governing law: Ireland. Nothing here limits your statutory rights.</p>
    </article>
  );
}
