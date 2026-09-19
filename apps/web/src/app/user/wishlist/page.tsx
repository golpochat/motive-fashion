'use client';

import Link from 'next/link';
import { availableStock } from '@motive-fashion/utils';
import { API, apiErrorMessage } from '@/lib/api';
import { addCartItem } from '@/lib/cart-store';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { PrimaryButton, SecondaryButton } from '@/components/dashboard-ui';
import { StorefrontImage } from '@/components/storefront-image';

type Wish = {
  productId: string;
  product: {
    title: string;
    slug: string;
    images: { url: string; alt: string }[];
    variants: { id: string; inventory: { onHand: number; reserved: number }[] }[];
  };
};

function firstInStock(item: Wish) {
  return item.product.variants.find((variant) =>
    variant.inventory.some((row) => availableStock(row.onHand, row.reserved) > 0),
  );
}

export default function UserWishlist() {
  const { data, error, loading, reload, setData } = useConsoleQuery<Wish[]>(
    '/account/wishlist',
    'Could not load your wishlist',
  );
  const items = data ?? [];

  async function remove(productId: string) {
    const res = await fetch(`${API}/account/wishlist/${productId}`, { method: 'DELETE', credentials: 'include' });
    if (!res.ok) {
      const payload = await res.json().catch(() => null);
      throw new Error(apiErrorMessage(payload, 'Could not remove this piece'));
    }
    setData(items.filter((item) => item.productId !== productId));
  }

  async function addToBag(item: Wish) {
    const variant = firstInStock(item);
    if (!variant) return;
    await addCartItem(variant.id, 1);
  }

  return (
    <div>
      <PageHeader title="Wishlist" description="Pieces you saved while browsing." />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={items.length === 0}
        emptyTitle="Nothing saved"
        emptyBody="Tap the heart on a product to keep it here."
      >
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => {
            const image = item.product.images[0];
            const inStock = Boolean(firstInStock(item));
            return (
              <li key={item.productId} className="overflow-hidden rounded-2xl border border-ink/10 bg-white">
                <Link href={`/product/${item.product.slug}`} className="block no-underline">
                  <div className="relative aspect-[4/5] bg-ink/5">
                    {image ? <StorefrontImage src={image.url} alt={image.alt || item.product.title} sizes="320px" /> : null}
                    {!inStock ? (
                      <span className="absolute left-3 top-3 rounded-full bg-primary/90 px-3 py-1 text-xs text-cream">
                        Sold out
                      </span>
                    ) : null}
                  </div>
                  <p className="px-4 pt-3 font-medium">{item.product.title}</p>
                </Link>
                <div className="flex gap-2 p-4">
                  <PrimaryButton
                    type="button"
                    className="flex-1"
                    disabled={!inStock}
                    onClick={() => void addToBag(item).catch(() => reload())}
                  >
                    {inStock ? 'Add to bag' : 'Sold out'}
                  </PrimaryButton>
                  <SecondaryButton type="button" onClick={() => void remove(item.productId).catch(() => reload())}>
                    Remove
                  </SecondaryButton>
                </div>
              </li>
            );
          })}
        </ul>
      </ConsoleSection>
    </div>
  );
}
