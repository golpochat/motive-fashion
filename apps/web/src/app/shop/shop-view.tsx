import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CatalogEmpty, CatalogError, ProductGrid } from '@/components/catalog-state';
import { ShopSearch } from '@/components/shop-search';
import { loadCatalog, type Category } from '@/lib/catalog';
import type { ProductCard } from '@/lib/api';

function chipClass(active: boolean) {
  return `inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-sm no-underline ${
    active ? 'border-accent bg-accent/15' : 'border-ink/15 hover:border-accent'
  }`;
}

export async function ShopView({ category, q }: { category?: string; q?: string }) {
  const qs = new URLSearchParams();
  if (category) qs.set('category', category);
  if (q) qs.set('q', q);
  const query = qs.toString();
  const [productsResult, categoriesResult] = await Promise.all([
    loadCatalog<ProductCard[]>(`/catalog/products${query ? `?${query}` : ''}`),
    loadCatalog<Category[]>('/catalog/categories'),
  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];
  if (category && categoriesResult.ok && !categories.some((c) => c.slug === category)) {
    notFound();
  }

  const currentName = categories.find((c) => c.slug === category)?.name;
  const searchAction = category ? `/shop/${category}` : '/shop';
  const keepQuery = q ? `?q=${encodeURIComponent(q)}` : '';

  return (
    <div>
      <h1 className="font-serif text-4xl">{currentName ?? 'Shop'}</h1>
      <p className="mt-2 text-sm text-ink/70">VAT-inclusive prices. Ireland delivery and Dublin collection.</p>
      <ShopSearch action={searchAction} defaultQuery={q ?? ''} />
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={q ? `/shop?q=${encodeURIComponent(q)}` : '/shop'} className={chipClass(!category)}>
          All
        </Link>
        {categories.map((c) => (
          <Link key={c.slug} href={`/shop/${c.slug}${keepQuery}`} className={chipClass(category === c.slug)}>
            {c.name}
          </Link>
        ))}
      </div>
      {!productsResult.ok ? (
        <CatalogError />
      ) : productsResult.data.length === 0 ? (
        <CatalogEmpty
          title={q ? `No results for “${q}”` : currentName ? `No ${currentName.toLowerCase()} in stock` : 'Nothing in this edit yet'}
          body={
            q
              ? 'Try another spelling, or browse a category.'
              : 'Pieces will appear here when they are published and in stock.'
          }
          href="/shop"
          cta="View all"
        />
      ) : (
        <ProductGrid products={productsResult.data} />
      )}
    </div>
  );
}
