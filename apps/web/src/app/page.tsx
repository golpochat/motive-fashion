import Link from 'next/link';
import { api, type ProductCard } from '@/lib/api';
import { ProductTile } from '@/components/product-tile';

export default async function HomePage() {
  let products: ProductCard[] = [];
  try {
    products = await api<ProductCard[]>('/catalog/products');
  } catch {
    products = [];
  }
  const featuredSlugs = [
    'luxury-silk-abaya',
    'everyday-chiffon-hijab',
    'french-jilbab',
    'summer-linen-dress',
    'prayer-set',
    'premium-crepe-abaya',
  ];
  const featured = featuredSlugs
    .map((slug) => products.find((p) => p.slug === slug))
    .filter((p): p is ProductCard => Boolean(p));
  const hero =
    products.find((p) => p.slug === 'luxury-silk-abaya')?.images[0] ?? products[0]?.images[0];
  return (
    <div>
      <section className="grid gap-10 py-12 md:grid-cols-2 md:items-center">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-clay">Dublin · modest wear</p>
          <h1 className="mt-3 font-serif text-5xl leading-tight md:text-6xl">Quiet luxury, made to wear.</h1>
          <p className="mt-4 max-w-md text-ink/80">
            Motive Fashion is a Dublin house for hijabs, abayas, jilbabs, and prayer sets. Photographed for drape,
            priced with VAT included.
          </p>
          <div className="mt-8 flex gap-3">
            <Link href="/shop" className="rounded-full bg-ink px-6 py-3 text-cream no-underline">
              Shop the edit
            </Link>
            <Link href="/collections/eid" className="rounded-full border border-ink/20 px-6 py-3 no-underline">
              Eid collection
            </Link>
          </div>
        </div>
        <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-moss/20">
          {hero ? (
            <img src={hero.url} alt={hero.alt} className="h-full w-full object-cover" />
          ) : null}
        </div>
      </section>
      <h2 className="font-serif text-3xl">In stock now</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
