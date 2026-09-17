import Link from 'next/link';
import { notFound } from 'next/navigation';
import { api, type ProductCard } from '@/lib/api';
import { BRAND } from '@motive-fashion/config';
import { variantPriceRange } from '@/lib/catalog';
import { AddToCart } from '@/components/add-to-cart';
import { ProductGallery } from '@/components/product-gallery';
import { WishlistButton } from '@/components/wishlist-button';
import { ShareButton } from '@/components/share-button';
import { ProductReviews } from '@/components/product-reviews';
import { RatingStars } from '@/components/rating-stars';
import { absoluteUrl } from '@/lib/share';
import type { Metadata } from 'next';

type ProductDetail = ProductCard & {
  coverage?: string;
  originCountry?: string;
  care?: string;
  prayerReady?: boolean;
  categoryName?: string;
  reviews?: { rating: number; body: string; name: string; createdAt?: string }[];
  ratingAvg?: number | null;
  ratingCount?: number;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  try {
    const p = await api<ProductCard>(`/catalog/products/${slug}`);
    const url = absoluteUrl(`/product/${p.slug}`);
    const image = p.images[0];
    const imageUrl = image ? absoluteUrl(image.url) : undefined;
    return {
      title: p.title,
      description: p.description,
      alternates: { canonical: url },
      openGraph: {
        type: 'website',
        locale: 'en_IE',
        url,
        title: p.title,
        description: p.description,
        siteName: BRAND.name,
        images: imageUrl ? [{ url: imageUrl, alt: image?.alt || p.title }] : undefined,
      },
      twitter: {
        card: imageUrl ? 'summary_large_image' : 'summary',
        title: p.title,
        description: p.description,
        images: imageUrl ? [imageUrl] : undefined,
      },
    };
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
  const range = variantPriceRange(product.variants);
  const availability = product.variants.some((v) => v.available > 0)
    ? 'https://schema.org/InStock'
    : 'https://schema.org/OutOfStock';
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map((image) => absoluteUrl(image.url)),
    brand: { '@type': 'Brand', name: BRAND.name },
    offers: range.mixed
      ? {
          '@type': 'AggregateOffer',
          priceCurrency: 'EUR',
          lowPrice: (range.min / 100).toFixed(2),
          highPrice: (range.max / 100).toFixed(2),
          availability,
        }
      : {
          '@type': 'Offer',
          priceCurrency: 'EUR',
          price: (range.min / 100).toFixed(2),
          availability,
        },
  };
  const categoryLabel = product.categoryName ?? product.categorySlug.replace(/-/g, ' ');
  const ratingCount = product.ratingCount ?? 0;
  const ratingAvg = product.ratingAvg ?? null;
  if (ratingCount && ratingAvg != null) {
    Object.assign(jsonLd, {
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: ratingAvg.toFixed(1),
        reviewCount: ratingCount,
        bestRating: 5,
        worstRating: 1,
      },
    });
  }
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
            {ratingCount && ratingAvg != null ? (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-sm text-ink/70 no-underline">
                <RatingStars value={ratingAvg} />
                <span>
                  {ratingAvg.toFixed(1)} · {ratingCount === 1 ? '1 review' : `${ratingCount} reviews`}
                </span>
              </a>
            ) : null}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <ShareButton
              title={product.title}
              path={`/product/${product.slug}`}
              text={product.description}
              image={product.images[0]?.url}
            />
            <WishlistButton productId={product.id} />
          </div>
        </div>
        <AddToCart variants={product.variants}>
          <p className="mt-4 text-ink/70">{product.description}</p>
        </AddToCart>
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
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase tracking-wider text-ink/55">Care</dt>
            <dd className="mt-1">{product.care ?? '—'}</dd>
          </div>
        </dl>
        <ProductReviews productId={product.id} reviews={product.reviews ?? []} />
      </div>
    </div>
  );
}
