'use client';

import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { SecondaryButton } from '@/components/dashboard-ui';

type Wish = {
  productId: string;
  product: { title: string; slug: string; images: { url: string; alt: string }[] };
};

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
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4">
              <Link href={`/product/${item.product.slug}`} className="text-sm font-medium">
                {item.product.title}
              </Link>
              <SecondaryButton type="button" onClick={() => void remove(item.productId).catch(() => reload())}>
                Remove
              </SecondaryButton>
            </li>
          ))}
        </ul>
      </ConsoleSection>
    </div>
  );
}
