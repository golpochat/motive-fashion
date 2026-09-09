import Link from 'next/link';
import { ProductTile } from '@/components/product-tile';
import type { ProductCard } from '@/lib/api';

export function CatalogError({
  title = 'The shop could not load',
  body = 'We could not reach the catalog. Check your connection and try again.',
}: {
  title?: string;
  body?: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mt-2 text-sm text-ink/70">{body}</p>
      <Link href="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-cream no-underline">
        Retry shop
      </Link>
    </div>
  );
}

export function CatalogEmpty({
  title = 'Nothing in this edit yet',
  body = 'Pieces will appear here when they are in stock. Browse the full shop in the meantime.',
  href = '/shop',
  cta = 'Shop all',
}: {
  title?: string;
  body?: string;
  href?: string;
  cta?: string;
}) {
  return (
    <div className="mt-8 rounded-2xl border border-ink/10 bg-white px-6 py-12 text-center">
      <h2 className="font-serif text-2xl">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-ink/70">{body}</p>
      <Link href={href} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-cream no-underline">
        {cta}
      </Link>
    </div>
  );
}

export function ProductGrid({ products }: { products: ProductCard[] }) {
  return (
    <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {products.map((product) => (
        <ProductTile key={product.id} product={product} />
      ))}
    </div>
  );
}
