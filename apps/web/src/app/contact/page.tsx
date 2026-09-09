import { BRAND } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';
import { ContactForm } from './contact-form';

export const metadata = pageMeta(
  'Contact',
  `Write to ${BRAND.name} in Dublin. Collection by appointment. Ireland delivery typically 2–5 working days.`,
);

export default function ContactPage() {
  return (
    <article className="mx-auto grid max-w-4xl gap-10 lg:grid-cols-2">
      <div className="space-y-4">
        <h1 className="font-serif text-4xl">Contact</h1>
        <p className="text-ink/70">
          Questions about an order, a size, or Dublin collection — send the form or email{' '}
          <a href={`mailto:${BRAND.supportEmail}`}>{BRAND.supportEmail}</a>.
        </p>
        <dl className="space-y-4 text-sm">
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Studio</dt>
            <dd className="mt-1">
              {BRAND.name}, {BRAND.city}, {BRAND.country}
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Hours</dt>
            <dd className="mt-1">
              Collection by appointment. We reply on Irish working days, typically within one business day.
            </dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Delivery</dt>
            <dd className="mt-1">Ireland delivery typically 2–5 working days. WhatsApp orders use the same stock as the website.</dd>
          </div>
        </dl>
        <p className="text-sm text-ink/70">
          Data requests: export or delete from <a href="/account">Account</a>, or email the address above. We do not send
          marketing WhatsApp unless you opt in.
        </p>
      </div>
      <ContactForm />
    </article>
  );
}
