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

  return (
    <div>
      <section className="relative overflow-hidden rounded-3xl">
        <img
          src="/brand/hero-home.jpg"
          alt="Quiet luxury modest wear in a Dublin atelier"
          className="h-[28rem] w-full object-cover md:h-[34rem]"
        />
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
            <Link href="/shop" className="rounded-full bg-accent px-6 py-3 text-cream no-underline">
              Shop the edit
            </Link>
            <Link href="/collections/eid" className="rounded-full border border-cream/40 px-6 py-3 text-cream no-underline">
              Eid collection
            </Link>
          </div>
        </div>
      </section>
      <h2 className="mt-12 font-serif text-3xl">In stock now</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {featured.map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
