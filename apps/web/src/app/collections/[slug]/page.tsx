import { notFound } from 'next/navigation';
import { CatalogEmpty, CatalogError, ProductGrid } from '@/components/catalog-state';
import { HERO_IMAGE_SIZES, StorefrontImage } from '@/components/storefront-image';
import { loadCatalog, loadCatalogPage, type Collection } from '@/lib/catalog';
import { pageMeta } from '@/lib/page-meta';
import { ShareButton } from '@/components/share-button';

const BANNERS: Record<string, { src: string; alt: string; blurb: string }> = {
  eid: {
    src: '/brand/banner-eid.jpg',
    alt: 'Eid collection — champagne hijabs and emerald abaya',
    blurb: 'Eid pieces in champagne, sage, and emerald. VAT included.',
  },
  ramadan: {
    src: '/brand/hero-editorial.jpg',
    alt: 'Ramadan collection — abaya and hijab still life',
    blurb: 'Ramadan layers for prayer and evenings at home.',
  },
  winter: {
    src: '/brand/hero-editorial.jpg',
    alt: 'Winter collection — modest layers',
    blurb: 'Heavier weaves for Irish weather.',
  },
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const result = await loadCatalog<Collection[]>('/catalog/collections');
  const collection = result.ok ? result.data.find((row) => row.slug === slug) : undefined;
  if (result.ok && !collection) {
    return pageMeta('Collection not found', 'That collection is not in the Motive Fashion house.');
  }
  const name = collection?.name ?? slug.replace(/-/g, ' ');
  return pageMeta(
    name,
    collection?.description || `The ${name} collection from Motive Fashion, Dublin. VAT included.`,
    BANNERS[slug]?.src,
  );
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [collectionsResult, productsResult] = await Promise.all([
    loadCatalog<Collection[]>('/catalog/collections'),
    loadCatalogPage(`/catalog/products?collection=${encodeURIComponent(slug)}`),
  ]);

  if (collectionsResult.ok && !collectionsResult.data.some((row) => row.slug === slug)) {
    notFound();
  }

  const collection = collectionsResult.ok ? collectionsResult.data.find((row) => row.slug === slug) : undefined;
  const banner = BANNERS[slug];
  const title = collection?.name ?? slug.replace(/-/g, ' ');
  const blurb = collection?.description || banner?.blurb;

  return (
    <div>
      {banner ? (
        <section className="relative mb-10 overflow-hidden rounded-3xl">
          <div className="relative h-56 w-full md:h-72">
            <StorefrontImage src={banner.src} alt={banner.alt} sizes={HERO_IMAGE_SIZES} priority />
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <h1 className="font-serif text-4xl text-cream">{title}</h1>
            {blurb ? <p className="mt-2 max-w-lg text-sm text-cream/85">{blurb}</p> : null}
          </div>
          <div className="absolute right-4 top-4">
            <ShareButton title={title} path={`/collections/${slug}`} text={blurb} image={banner.src} />
          </div>
        </section>
      ) : (
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-4xl">{title}</h1>
            {blurb ? <p className="mt-2 max-w-lg text-sm text-ink/70">{blurb}</p> : null}
          </div>
          <ShareButton title={title} path={`/collections/${slug}`} text={blurb} />
        </div>
      )}
      {!productsResult.ok ? (
        <CatalogError />
      ) : productsResult.data.items.length === 0 ? (
        <CatalogEmpty title={`Nothing in ${title} yet`} body="This collection has no published pieces right now." />
      ) : (
        <ProductGrid products={productsResult.data.items} />
      )}
    </div>
  );
}
