import { BRAND, RETURN_POSTAGE_NOTICE, legalDisplayName } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Returns',
  `${BRAND.returnDays}-day returns for Motive Fashion orders. Change of mind after dispatch: you pay return postage.`,
);

export default function ReturnsPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Returns</h1>
      <p className="text-ink/70">
        You have {BRAND.returnDays} days from delivery (or from the collection date) to withdraw from an online, app, or
        WhatsApp order. Items must be unworn, unwashed, and with tags attached.
      </p>
      <p className="text-ink/70">{RETURN_POSTAGE_NOTICE}</p>
      <p className="text-ink/70">
        Change of mind after we have dispatched: we refund the goods in full (including any outbound delivery you paid).
        You pay return postage to the shop. Cancel before dispatch (before the order is shipped or collected): full
        refund, nothing to return.
      </p>
      <p className="text-ink/70">
        If an item is faulty, not as described, or damaged in transit: full refund and we cover the return. Exchanges:
        you pay return of the original and normal outbound on the replacement unless we waive it.
      </p>
      <p className="text-ink/70">
        Collection orders have no outbound delivery line. Bring the piece back to the Dublin shop, or pay to post it.
      </p>
      <p className="text-ink/70">
        Hygiene exception: sealed undercaps, niqabs, and similar pieces cannot be returned if the seal is broken, except
        where they are faulty.
      </p>
      <p className="text-ink/70">
        Start a return from your order email, from <a href="/user/orders">Account</a> if you are signed in, or write to{' '}
        <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a> with your order reference.
      </p>
      <p className="text-ink/70">Refunds go back to the original payment method after we receive and inspect the return.</p>
      <section id="withdrawal" className="space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
        <h2 className="font-serif text-2xl">Model withdrawal form</h2>
        <p className="text-ink/70">
          Complete and send this only if you want to withdraw from the contract. Email it to {BRAND.supportEmail} or post
          it to the address on <a href="/legal/business">Business details</a>.
        </p>
        <p className="text-ink/70">To {legalDisplayName()}, trading as {BRAND.name}, Dublin, Ireland.</p>
        <p className="text-ink/70">
          I/We hereby give notice that I/We withdraw from my/our contract of sale of the following goods:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-ink/70">
          <li>Ordered on (date) / received on (date): ________</li>
          <li>Order reference: ________</li>
          <li>Name of consumer: ________</li>
          <li>Address of consumer: ________</li>
          <li>Signature of consumer (only if this form is notified on paper): ________</li>
          <li>Date: ________</li>
        </ul>
      </section>
    </article>
  );
}
