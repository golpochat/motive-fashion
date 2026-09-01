import Link from 'next/link';
import { formatEur } from '@motive-fashion/utils';
import type { ProductCard } from '@/lib/api';

export function ProductTile({ product }: { product: ProductCard }) {
  const image = product.images[0];
  return (
    <Link href={`/product/${product.slug}`} className="group no-underline">
      <div className="aspect-[3/4] overflow-hidden rounded-2xl bg-ink/5">
        {image ? (
          <img src={image.url} alt={image.alt} className="h-full w-full object-cover" />
        ) : null}
      </div>
      <p className="mt-3 font-medium">{product.title}</p>
      <p className="text-sm text-ink/70">{formatEur(product.variants[0]?.priceCents ?? 0)} inc. VAT</p>
    </Link>
  );
}
