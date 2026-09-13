import { BRAND, RETURN_POSTAGE_NOTICE } from '@motive-fashion/config';
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
    </article>
  );
}
