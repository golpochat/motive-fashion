import {
  BRAND,
  isVatRegistered,
  legalDisplayName,
  traderAddressDisplay,
  vatNumberDisplay,
} from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Business details',
  `Trader identity for ${BRAND.name}, Dublin. Sole trader imprint for distance contracts.`,
);

export default function BusinessPage() {
  const vat = vatNumberDisplay();
  const address = traderAddressDisplay();
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Business details</h1>
      <p className="text-ink/70">
        Distance contracts on this site, the app, WhatsApp, and the till are with the sole trader below — not a limited
        company.
      </p>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wider text-ink/55">Trading name</dt>
          <dd className="mt-1">{BRAND.name}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-ink/55">Legal name</dt>
          <dd className="mt-1">{legalDisplayName()}, sole trader</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-ink/55">Address</dt>
          <dd className="mt-1">{address || `${BRAND.city}, ${BRAND.country}`}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-ink/55">Email</dt>
          <dd className="mt-1">
            <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wider text-ink/55">VAT</dt>
          <dd className="mt-1">
            {isVatRegistered() && vat ? vat : 'Not VAT-registered. Prices are in euro, not advertised as VAT-inclusive.'}
          </dd>
        </div>
      </dl>
      <p className="text-ink/70">
        You have {BRAND.returnDays} days from delivery or collection to withdraw. Model form:{' '}
        <a href="/legal/returns#withdrawal">Returns</a>. Terms: <a href="/legal/terms">Terms</a>.
      </p>
    </article>
  );
}
