import Link from 'next/link';
import { CatalogEmpty, CatalogError, ProductGrid } from '@/components/catalog-state';
import { HERO_IMAGE_SIZES, StorefrontImage } from '@/components/storefront-image';
import { featuredCollection, featuredProducts, loadCatalog, loadCatalogPage, type Collection } from '@/lib/catalog';
import { BRAND, isVatRegistered, shopPriceBlurb } from '@motive-fashion/config';

export const metadata = {
  title: { absolute: `${BRAND.name} — modest wear, Dublin` },
  description:
    `Premium modest wear from Dublin. Hijabs, abayas, jilbabs, and prayer sets. ${shopPriceBlurb()}`,
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
  const [result, collectionsResult] = await Promise.all([
    loadCatalogPage('/catalog/products'),
    loadCatalog<Collection[]>('/catalog/collections'),
  ]);
  const featured = result.ok ? featuredProducts(result.data.items, FEATURED_SLUGS) : [];
  const collections = collectionsResult.ok ? collectionsResult.data : [];
  const seasonal = featuredCollection(collections);

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
            Hijabs, abayas, jilbabs, and prayer sets. Photographed for drape, priced in euro
            {isVatRegistered() ? ' with VAT included' : ''}.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="rounded-full bg-primary px-6 py-3 text-cream no-underline">
              Shop the edit
            </Link>
            {seasonal ? (
              <Link
                href={`/collections/${seasonal.slug}`}
                className="rounded-full border border-cream/40 px-6 py-3 text-cream no-underline"
              >
                {seasonal.name} collection
              </Link>
            ) : null}
          </div>
        </div>
      </section>
      {collections.length ? (
        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <h2 className="font-serif text-3xl">Collections</h2>
            <Link href="/collections" className="text-sm text-ink/70 no-underline hover:text-accent">
              All collections
            </Link>
          </div>
          <ul className="mt-4 flex flex-wrap gap-2">
            {collections.map((collection) => (
              <li key={collection.slug}>
                <Link
                  href={`/collections/${collection.slug}`}
                  className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-4 py-2.5 text-sm no-underline hover:border-accent"
                >
                  {collection.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
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
