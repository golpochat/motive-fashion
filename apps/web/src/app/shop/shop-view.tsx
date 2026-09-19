import Link from 'next/link';
import { notFound } from 'next/navigation';
import { CATALOG_COLORS, CATALOG_SIZES, catalogSizeLabel } from '@motive-fashion/utils';
import { shopPriceBlurb } from '@motive-fashion/config';
import { CatalogEmpty, CatalogError, ProductGrid } from '@/components/catalog-state';
import { ShopSearch } from '@/components/shop-search';
import { loadCatalog, loadCatalogPage, type Category } from '@/lib/catalog';

export type ShopFilters = {
  category?: string;
  q?: string;
  size?: string;
  color?: string;
  inStock?: string;
  after?: string;
};

function chipClass(active: boolean) {
  return `inline-flex min-h-11 items-center rounded-full border px-4 py-2.5 text-sm no-underline ${
    active ? 'border-accent bg-accent/15' : 'border-ink/15 hover:border-accent'
  }`;
}

export function shopHref(filters: ShopFilters, patch: Partial<ShopFilters> = {}) {
  const next = { ...filters, ...patch };
  const params = new URLSearchParams();
  if (next.q) params.set('q', next.q);
  if (next.size) params.set('size', next.size);
  if (next.color) params.set('color', next.color);
  if (next.inStock) params.set('inStock', next.inStock);
  if (next.after) params.set('after', next.after);
  const path = next.category ? `/shop/${next.category}` : '/shop';
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function ShopView(filters: ShopFilters) {
  const { category, q, size, color, inStock, after } = filters;
  const qs = new URLSearchParams();
  if (category) qs.set('category', category);
  if (q) qs.set('q', q);
  if (size) qs.set('size', size);
  if (color) qs.set('color', color);
  if (inStock === '1' || inStock === 'true') qs.set('inStock', '1');
  if (after) qs.set('cursor', after);
  const query = qs.toString();
  const [productsResult, categoriesResult] = await Promise.all([
    loadCatalogPage(`/catalog/products${query ? `?${query}` : ''}`),
    loadCatalog<Category[]>('/catalog/categories'),
  ]);

  const categories = categoriesResult.ok ? categoriesResult.data : [];
  if (category && categoriesResult.ok && !categories.some((c) => c.slug === category)) {
    notFound();
  }

  const currentName = categories.find((c) => c.slug === category)?.name;
  const searchAction = category ? `/shop/${category}` : '/shop';
  const hidden = {
    ...(size ? { size } : {}),
    ...(color ? { color } : {}),
    ...(inStock === '1' || inStock === 'true' ? { inStock: '1' } : {}),
  };

  return (
    <div>
      <h1 className="font-serif text-4xl">{currentName ?? 'Shop'}</h1>
      <p className="mt-2 text-sm text-ink/70">{shopPriceBlurb()}</p>
      <ShopSearch action={searchAction} defaultQuery={q ?? ''} hidden={hidden} />
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href={shopHref({ ...filters, after: undefined }, { category: undefined })} className={chipClass(!category)}>
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={shopHref({ ...filters, after: undefined }, { category: c.slug })}
            className={chipClass(category === c.slug)}
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wider text-ink/45">Size</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATALOG_SIZES.map((item) => (
            <Link
              key={item}
              href={shopHref({ ...filters, after: undefined }, { size: size === item ? undefined : item })}
              className={chipClass(size === item)}
            >
              {catalogSizeLabel(item)}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <p className="text-xs uppercase tracking-wider text-ink/45">Colour</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {CATALOG_COLORS.map((item) => (
            <Link
              key={item}
              href={shopHref({ ...filters, after: undefined }, { color: color === item ? undefined : item })}
              className={chipClass(color === item)}
            >
              {item}
            </Link>
          ))}
        </div>
      </div>
      <div className="mt-4">
        <Link
          href={shopHref({ ...filters, after: undefined }, { inStock: inStock === '1' ? undefined : '1' })}
          className={chipClass(inStock === '1')}
        >
          In stock only
        </Link>
      </div>
      {!productsResult.ok ? (
        <CatalogError />
      ) : productsResult.data.items.length === 0 ? (
        <CatalogEmpty
          title={q ? `No results for “${q}”` : currentName ? `No ${currentName.toLowerCase()} in this filter` : 'Nothing in this edit yet'}
          body={
            q || size || color || inStock
              ? 'Try another size, colour, or spelling — or clear the filters.'
              : 'Pieces will appear here when they are published and in stock.'
          }
          href="/shop"
          cta="View all"
        />
      ) : (
        <>
          <ProductGrid products={productsResult.data.items} />
          {productsResult.data.nextCursor ? (
            <p className="mt-8">
              <Link
                href={shopHref(filters, { after: productsResult.data.nextCursor })}
                className="inline-flex min-h-11 items-center rounded-full border border-ink/15 px-5 py-2.5 text-sm no-underline hover:border-accent"
              >
                More pieces
              </Link>
            </p>
          ) : null}
        </>
      )}
    </div>
  );
}
