import Link from 'next/link';
import { api, type ProductCard } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

export default async function HomePage() {
  let products: ProductCard[] = [];
  try {
    products = await api<ProductCard[]>('/catalog/products');
  } catch {
    products = [];
  }
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
        <div className="aspect-[3/4] rounded-3xl bg-moss/20" />
      </section>
      <h2 className="font-serif text-3xl">In stock now</h2>
      <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.slice(0, 6).map((p) => (
          <Link key={p.id} href={`/product/${p.slug}`} className="group no-underline">
            <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-ink/5">
              {p.images[0] ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.images[0].url} alt={p.images[0].alt} className="h-full w-full object-cover" />
              ) : null}
            </div>
            <p className="mt-3 font-medium">{p.title}</p>
            <p className="text-sm text-ink/70">{formatEur(p.variants[0]?.priceCents ?? 0)}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
