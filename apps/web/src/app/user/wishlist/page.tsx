'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/page-header';

type Wish = {
  productId: string;
  product: { title: string; slug: string; images: { url: string; alt: string }[] };
};

export default function UserWishlist() {
  const [items, setItems] = useState<Wish[] | null>(null);

  function reload() {
    fetch(`${API}/account/wishlist`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setItems);
  }

  useEffect(() => {
    reload();
  }, []);

  async function remove(productId: string) {
    await fetch(`${API}/account/wishlist/${productId}`, { method: 'DELETE', credentials: 'include' });
    reload();
  }

  return (
    <div>
      <PageHeader title="Wishlist" description="Pieces you saved while browsing." />
      {!items ? (
        <p className="text-sm text-ink/60">Loading…</p>
      ) : items.length === 0 ? (
        <EmptyState title="Nothing saved" body="Tap the heart on a product to keep it here." />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.productId} className="flex items-center justify-between rounded-2xl border border-ink/10 bg-white p-4">
              <Link href={`/product/${item.product.slug}`} className="text-sm font-medium">
                {item.product.title}
              </Link>
              <button type="button" className="rounded-full border px-3 py-1 text-sm" onClick={() => void remove(item.productId)}>
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
