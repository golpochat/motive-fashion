'use client';

import Link from 'next/link';
import { availableStock } from '@motive-fashion/utils';
import { API, apiErrorMessage } from '@/lib/api';
import { addCartItem } from '@/lib/cart-store';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, IconButton, JobCard, RowActions, Td } from '@/components/dashboard-ui';
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
        <DataTable
          headers={['Piece', 'Stock', 'Action']}
          cards={items.map((item) => {
            const image = item.product.images[0];
            const inStock = Boolean(firstInStock(item));
            return (
              <JobCard
                key={item.productId}
                href={`/product/${item.product.slug}`}
                title={item.product.title}
                meta={inStock ? 'In Dublin' : 'Sold out'}
                actions={<WishActions item={item} inStock={inStock} onAdd={addToBag} onRemove={remove} onFail={reload} />}
              >
                {image ? (
                  <div className="relative mt-3 h-24 w-20 overflow-hidden rounded-lg bg-ink/5">
                    <StorefrontImage src={image.url} alt={image.alt || item.product.title} sizes="80px" />
                  </div>
                ) : null}
              </JobCard>
            );
          })}
        >
          {items.map((item) => {
            const image = item.product.images[0];
            const inStock = Boolean(firstInStock(item));
            return (
              <tr key={item.productId} className="hover:bg-ink/5">
                <Td>
                  <Link href={`/product/${item.product.slug}`} className="flex items-center gap-3 no-underline">
                    <span className="relative h-14 w-11 shrink-0 overflow-hidden rounded-lg bg-ink/5">
                      {image ? <StorefrontImage src={image.url} alt={image.alt || item.product.title} sizes="44px" /> : null}
                    </span>
                    <span className="font-medium">{item.product.title}</span>
                  </Link>
                </Td>
                <Td muted>{inStock ? 'In Dublin' : 'Sold out'}</Td>
                <Td nowrap>
                  <WishActions item={item} inStock={inStock} onAdd={addToBag} onRemove={remove} onFail={reload} />
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}

function WishActions({
  item,
  inStock,
  onAdd,
  onRemove,
  onFail,
}: {
  item: Wish;
  inStock: boolean;
  onAdd: (item: Wish) => Promise<void>;
  onRemove: (productId: string) => Promise<void>;
  onFail: () => void;
}) {
  return (
    <RowActions>
      <IconButton
        label={inStock ? 'Add to bag' : 'Sold out'}
        icon="cart"
        disabled={!inStock}
        onClick={() => void onAdd(item).catch(onFail)}
      />
      <IconButton
        label="Remove from wishlist"
        icon="trash"
        tone="danger"
        onClick={() => void onRemove(item.productId).catch(onFail)}
      />
    </RowActions>
  );
}
