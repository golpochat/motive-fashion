import Link from 'next/link';
import { CatalogEmpty, CatalogError } from '@/components/catalog-state';
import { HERO_IMAGE_SIZES, StorefrontImage } from '@/components/storefront-image';
import { collectionHero, loadCatalog, type Collection } from '@/lib/catalog';
import { shopPriceBlurb } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';

export const metadata = pageMeta(
  'Collections',
  `Browse Motive Fashion collections — seasonal edits from Dublin. ${shopPriceBlurb()}`,
);

export default async function CollectionsIndexPage() {
  const result = await loadCatalog<Collection[]>('/catalog/collections');

  if (!result.ok) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Collections</h1>
        <CatalogError title="Collections could not load" body="We could not load the house edits. Try the shop." />
      </div>
    );
  }

  const collections = result.data;

  if (collections.length === 0) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Collections</h1>
        <CatalogEmpty
          title="No live edits just now"
          body="Published collections appear here. Browse the shop in the meantime."
        />
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Collections</h1>
      <p className="mt-2 text-sm text-ink/70">Seasonal edits from the Dublin house. {shopPriceBlurb()}</p>
      <ul className="mt-8 grid gap-6 sm:grid-cols-2">
        {collections.map((collection) => {
          const banner = collectionHero(collection);
          return (
            <li key={collection.slug}>
              <Link href={`/collections/${collection.slug}`} className="group block no-underline">
                <div className="relative aspect-[16/9] overflow-hidden rounded-2xl bg-ink/5">
                  {banner ? (
                    <StorefrontImage src={banner.src} alt={banner.alt} sizes={HERO_IMAGE_SIZES} />
                  ) : (
                    <div className="flex h-full items-end bg-primary/90 p-5">
                      <span className="font-serif text-2xl text-cream">{collection.name}</span>
                    </div>
                  )}
                  {banner ? (
                    <div className="absolute inset-0 flex items-end bg-gradient-to-t from-primary/75 to-transparent p-5">
                      <span className="font-serif text-2xl text-cream">{collection.name}</span>
                    </div>
                  ) : null}
                </div>
                {collection.description ? (
                  <p className="mt-3 text-sm text-ink/70 group-hover:text-ink">{collection.description}</p>
                ) : null}
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
