import Link from 'next/link';
import { CatalogEmpty, CatalogError, ProductGrid } from '@/components/catalog-state';
import { HERO_IMAGE_SIZES, StorefrontImage } from '@/components/storefront-image';
import { featuredProducts, loadCatalog } from '@/lib/catalog';
import { BRAND } from '@motive-fashion/config';
import type { ProductCard } from '@/lib/api';

export const metadata = {
  title: { absolute: `${BRAND.name} — modest wear, Dublin` },
  description:
    'Premium modest wear from Dublin. Hijabs, abayas, jilbabs, and prayer sets. VAT-inclusive prices. Collection and Ireland delivery.',
};

const FEATURED_SLUGS = [
  'luxury-silk-abaya',
  'everyday-chiffon-hijab',
  'french-jilbab',
  'summer-linen-dress',
  'prayer-set',
  'premium-crepe-abaya',
];

export default async function HomePage() {
  const result = await loadCatalog<ProductCard[]>('/catalog/products');
  const featured = result.ok ? featuredProducts(result.data, FEATURED_SLUGS) : [];

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl">
        <div className="relative h-[28rem] w-full md:h-[34rem]">
          <StorefrontImage
            src="/brand/hero-home.jpg"
            alt="Quiet luxury modest wear in a Dublin atelier"
            sizes={HERO_IMAGE_SIZES}
            priority
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-primary/80 via-primary/25 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-12">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Dublin · modest wear</p>
          <h1 className="mt-3 max-w-xl font-serif text-4xl leading-tight text-cream md:text-6xl">
            Quiet luxury, made to wear.
          </h1>
          <p className="mt-4 max-w-md text-cream/85">
            Hijabs, abayas, jilbabs, and prayer sets. Photographed for drape, priced with VAT included.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-full bg-primary px-6 py-3 text-cream no-underline">
              Shop the edit
            </Link>
            <Link href="/collections/eid" className="rounded-full border border-cream/40 px-6 py-3 text-cream no-underline">
              Eid collection
            </Link>
          </div>
        </div>
      </section>
      <h2 className="mt-12 font-serif text-3xl">In stock now</h2>
      {!result.ok ? (
        <CatalogError title="The edit could not load" body="We could not load featured pieces. Open the shop to try again." />
      ) : featured.length === 0 ? (
        <CatalogEmpty title="Nothing in stock just now" body="New pieces will land here. Browse the shop for the full catalog." />
      ) : (
        <ProductGrid products={featured} />
      )}
    </div>
  );
}
