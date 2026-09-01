import Link from 'next/link';
import { api, type ProductCard } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';
import { AddToCart } from '@/components/add-to-cart';
import type { Metadata } from 'next';

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await api<ProductCard>(`/catalog/products/${slug}`);
    return { title: p.title, description: p.description };
  } catch {
    return { title: 'Product' };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const product = await api<
    ProductCard & { coverage?: string; originCountry?: string; care?: string; prayerReady?: boolean }
  >(`/catalog/products/${slug}`);
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: ((product.variants[0]?.priceCents ?? 0) / 100).toFixed(2),
      availability: product.variants.some((v) => v.available > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
  return (
    <div className="grid gap-10 md:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <div className="aspect-[3/4] overflow-hidden rounded-3xl bg-ink/5">
        {product.images[0] ? (
          <img src={product.images[0].url} alt={product.images[0].alt} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <div>
        <p className="text-sm uppercase tracking-widest text-clay">{product.categorySlug}</p>
        <h1 className="mt-2 font-serif text-4xl">{product.title}</h1>
        <p className="mt-4 text-xl">{formatEur(product.variants[0]?.priceCents ?? 0)} inc. VAT</p>
        <p className="mt-4 text-ink/80">{product.description}</p>
        <AddToCart variants={product.variants} />
        <p className="mt-3 text-sm">
          <Link href="/size-guide">Size guide</Link>
        </p>
        <dl className="mt-8 space-y-2 text-sm">
          <div>Coverage: {product.coverage ?? '—'}</div>
          <div>Origin: {product.originCountry ?? '—'}</div>
          <div>Fabric: {product.variants[0]?.fabric ?? '—'}</div>
          <div>SKU: {product.variants[0]?.sku ?? '—'}</div>
          <div>Care: {product.care ?? '—'}</div>
        </dl>
      </div>
    </div>
  );
}
