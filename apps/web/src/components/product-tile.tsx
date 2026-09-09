import Link from 'next/link';
import { formatEur } from '@motive-fashion/utils';
import type { ProductCard } from '@/lib/api';
import { StorefrontImage, TILE_IMAGE_SIZES } from '@/components/storefront-image';
import { WishlistButton } from '@/components/wishlist-button';

export function ProductTile({ product }: { product: ProductCard }) {
  const image = product.images[0];
  return (
    <article className="relative">
      <Link href={`/product/${product.slug}`} className="no-underline">
        <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-ink/5">
          {image ? <StorefrontImage src={image.url} alt={image.alt} sizes={TILE_IMAGE_SIZES} /> : null}
        </div>
        <p className="mt-3 font-medium">{product.title}</p>
        <p className="text-sm text-ink/70">{formatEur(product.variants[0]?.priceCents ?? 0)} inc. VAT</p>
      </Link>
      <div className="absolute right-3 top-3">
        <WishlistButton productId={product.id} />
      </div>
    </article>
  );
}
