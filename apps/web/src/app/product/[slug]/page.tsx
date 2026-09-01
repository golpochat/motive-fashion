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
  const product = await api<ProductCard & { coverage?: string; originCountry?: string; care?: string }>(
    `/catalog/products/${slug}`,
  );
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
      <div className="aspect-[3/4] rounded-3xl bg-ink/5" />
      <div>
        <p className="text-sm uppercase tracking-widest text-clay">{product.categorySlug}</p>
        <h1 className="mt-2 font-serif text-4xl">{product.title}</h1>
        <p className="mt-4 text-xl">{formatEur(product.variants[0]?.priceCents ?? 0)} inc. VAT</p>
        <p className="mt-4 text-ink/80">{product.description}</p>
        <AddToCart variants={product.variants} />
        <dl className="mt-8 space-y-2 text-sm">
          <div>Coverage: {product.coverage ?? '—'}</div>
          <div>Origin: {product.originCountry ?? '—'}</div>
          <div>Care: {product.care ?? '—'}</div>
        </dl>
      </div>
    </div>
  );
}
