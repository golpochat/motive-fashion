import Link from 'next/link';
import { BRAND } from '@motive-fashion/config';
import { DashCard, PageHeader } from '@/components/page-header';
import { pageMeta } from '@/lib/page-meta';
import { workspaceById, type WorkspaceId } from '@/lib/workspaces';

export const notFoundMeta = {
  ...pageMeta('Page not found', `That address is not a page on ${BRAND.name}. Check the link, or continue from the shop.`),
  robots: { index: false, follow: false },
};

const storefrontLinks = [
  { href: '/shop', icon: 'products' as const, label: 'Shop', body: 'Hijabs, abayas, jilbabs, and prayer sets in stock now.' },
  { href: '/size-guide', icon: 'overview' as const, label: 'Size guide', body: 'Garment measurements for modest, slightly generous cuts.' },
  { href: '/user', icon: 'profile' as const, label: 'Account', body: 'Orders, wishlist, addresses, and privacy.' },
  { href: '/contact', icon: 'building' as const, label: 'Contact', body: `Write to the Dublin studio at ${BRAND.supportEmail}.` },
];

export function StorefrontNotFound() {
  return (
    <article className="mx-auto flex min-h-[min(36rem,70dvh)] max-w-3xl flex-col justify-center py-4">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">404</p>
      <h1 className="mt-3 font-serif text-4xl tracking-tight md:text-5xl">Page not found</h1>
      <p className="mt-4 max-w-xl text-ink/70">
        That address is not a page on {BRAND.name}. The link may be incomplete, or the page may have moved. Continue to
        the shop, your account, or the Dublin studio.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/shop"
          className="inline-flex min-h-11 items-center rounded-full bg-primary px-6 py-3 text-cream no-underline"
        >
          Shop the edit
        </Link>
        <Link
          href="/"
          className="inline-flex min-h-11 items-center rounded-full border border-ink/20 px-6 py-3 no-underline"
        >
          Back to home
        </Link>
      </div>
      <div className="mt-12 grid gap-4 sm:grid-cols-2">
        {storefrontLinks.map((item) => (
          <DashCard key={item.href} {...item} />
        ))}
      </div>
    </article>
  );
}

export function WorkspaceNotFound({ workspace }: { workspace: WorkspaceId }) {
  const ws = workspaceById(workspace);
  return (
    <div>
      <PageHeader
        title="Page not found"
        description={`That screen is not in ${ws.label}. Open the workspace home, or continue on the storefront.`}
      />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <DashCard href={ws.href} icon="overview" label={ws.label} body={`Return to the ${ws.label} home.`} />
        <DashCard href="/shop" icon="products" label="Shop" body="Continue on the Motive Fashion storefront." />
        <DashCard href="/contact" icon="building" label="Contact" body={`Email ${BRAND.supportEmail} if you expected this page.`} />
      </div>
    </div>
  );
}
