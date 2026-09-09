import { BRAND } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Privacy',
  `How ${BRAND.name} processes account, cart, and order data. Controller in Dublin. Payments via Stripe.`,
);

export default function PrivacyPage() {
  return (
    <article className="max-w-2xl space-y-4">
      <h1 className="font-serif text-4xl">Privacy</h1>
      <p className="text-ink/70">
        Controller: {BRAND.legalName}, {BRAND.city}. Contact: {BRAND.supportEmail}. We process account, cart, order, and
        delivery data to fulfil contracts (GDPR Art. 6(1)(b)). Staff access is limited to fulfilling and supporting
        orders.
      </p>
      <p className="text-ink/70">
        Payments are handled by Stripe. We do not store full card numbers. WhatsApp messages are processed to take
        orders. Email is sent through Resend when configured.
      </p>
      <p className="text-ink/70">
        Marketing email and WhatsApp require opt-in (Art. 6(1)(a)). You can withdraw consent at any time. Essential
        cookies (cart session, login) are required for the shop to work. Analytics stay off unless you accept them.
      </p>
      <p className="text-ink/70">
        You can export or delete your account from <a href="/account">Account</a>. Deletion keeps order rows needed for
        tax and consumer-law records, with personal fields removed.
      </p>
      <p className="text-ink/70">We do not sell personal data. Hosting is in the EU / EEA or with processors under SCCs where required.</p>
    </article>
  );
}
