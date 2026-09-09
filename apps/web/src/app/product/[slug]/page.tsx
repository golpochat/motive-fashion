import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ProductCard } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';
import { BRAND } from '@motive-fashion/config';
import { AddToCart } from '@/components/add-to-cart';
import { ProductGallery } from '@/components/product-gallery';
import { WishlistButton } from '@/components/wishlist-button';
import type { Metadata } from 'next';

type ProductDetail = ProductCard & {
  coverage?: string;
  originCountry?: string;
  care?: string;
  prayerReady?: boolean;
  categoryName?: string;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await api<ProductCard>(`/catalog/products/${slug}`);
    return { title: p.title, description: p.description };
  } catch {
    return { title: 'Product not found' };
  }
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let product: ProductDetail;
  try {
    product = await api<ProductDetail>(`/catalog/products/${slug}`);
  } catch {
    notFound();
  }
  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((image) => (image.url.startsWith('http') ? image.url : `${site}${image.url}`)),
    brand: { '@type': 'Brand', name: BRAND.name },
    offers: {
      '@type': 'Offer',
      priceCurrency: 'EUR',
      price: ((product.variants[0]?.priceCents ?? 0) / 100).toFixed(2),
      availability: product.variants.some((v) => v.available > 0)
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };
  const categoryLabel = product.categoryName ?? product.categorySlug.replace(/-/g, ' ');
  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <ProductGallery images={product.images} />
      <div>
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-widest text-accent">
              <Link href={`/shop/${product.categorySlug}`} className="no-underline">
                {categoryLabel}
              </Link>
            </p>
            <h1 className="mt-2 font-serif text-4xl">{product.title}</h1>
          </div>
          <WishlistButton productId={product.id} />
        </div>
        <p className="mt-4 text-xl">{formatEur(product.variants[0]?.priceCents ?? 0)} inc. VAT</p>
        <p className="mt-4 text-ink/70">{product.description}</p>
        <AddToCart variants={product.variants} />
        <p className="mt-3 text-sm">
          <Link href="/size-guide">Size guide</Link>
        </p>
        <dl className="mt-8 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Coverage</dt>
            <dd className="mt-1">{product.coverage ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Origin</dt>
            <dd className="mt-1">{product.originCountry ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">Fabric</dt>
            <dd className="mt-1">{product.variants[0]?.fabric ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wider text-ink/55">SKU</dt>
            <dd className="mt-1">{product.variants[0]?.sku ?? '—'}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-ink/55">Care</dt>
            <dd className="mt-1">{product.care ?? '—'}</dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
