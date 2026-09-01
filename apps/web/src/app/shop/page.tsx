import Link from 'next/link';
import { api, type ProductCard } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string }>;
}) {
  const q = await searchParams;
  const qs = new URLSearchParams();
  if (q.category) qs.set('category', q.category);
  if (q.q) qs.set('q', q.q);
  let products: ProductCard[] = [];
  let categories: { slug: string; name: string }[] = [];
  try {
    [products, categories] = await Promise.all([
      api<ProductCard[]>(`/catalog/products?${qs.toString()}`),
      api<{ slug: string; name: string }[]>('/catalog/categories'),
    ]);
  } catch {
    /* api offline */
  }
  return (
    <div>
      <h1 className="font-serif text-4xl">Shop</h1>
      <div className="mt-6 flex flex-wrap gap-2">
        <Link href="/shop" className="rounded-full border px-3 py-1 text-sm no-underline">
          All
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={`/shop/${c.slug}`}
            className="rounded-full border px-3 py-1 text-sm no-underline"
          >
            {c.name}
          </Link>
        ))}
      </div>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="no-underline">
            <div className="aspect-[3/4] rounded-2xl bg-ink/5" />
            <p className="mt-3">{p.title}</p>
            <p className="text-sm text-ink/70">{formatEur(p.variants[0]?.priceCents ?? 0)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
