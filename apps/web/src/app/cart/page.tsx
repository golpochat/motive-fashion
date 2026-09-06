'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatEur } from '@motive-fashion/utils';
import { BRAND } from '@motive-fashion/config';
import { CartLineRow } from '@/components/cart-line';
import { useSession } from '@/components/session-provider';
import { useCart } from '@/lib/cart-store';

export default function CartPage() {
  const { cart, loading, setQty, removeItem, close } = useCart();
  const { me } = useSession();

  useEffect(() => {
    close();
  }, [close]);

  if (loading && !cart) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Cart</h1>
        <p className="mt-4 text-ink/70">Loading…</p>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Cart</h1>
        <p className="mt-4 text-ink/70">Your cart is empty.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-cream no-underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Cart</h1>
      <p className="mt-2 text-sm text-ink/60">Reserved for {BRAND.reservationMinutes} minutes.</p>
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {cart.items.map((item) => (
            <CartLineRow
              key={item.id}
              item={item}
              onQty={(id, qty) => void setQty(id, qty)}
              onRemove={(id) => void removeItem(id)}
            />
          ))}
        </ul>
        <aside className="h-fit space-y-4 rounded-2xl border border-ink/10 bg-white p-5">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/60">Subtotal inc. VAT</span>
            <span className="font-medium tabular-nums">{formatEur(cart.subtotalCents)}</span>
          </div>
          <p className="text-xs text-ink/55">Delivery is calculated at checkout.</p>
          <Link href="/checkout" className="block rounded-full bg-primary px-5 py-3 text-center text-sm text-cream no-underline">
            Checkout
          </Link>
          {!me ? (
            <p className="text-center text-xs text-ink/55">
              Pay as a guest, or{' '}
              <Link href="/account?next=/checkout" className="text-ink/70 hover:text-accent">
                sign in
              </Link>
              .
            </p>
          ) : null}
          <Link href="/shop" className="block py-1 text-center text-sm text-ink/70 no-underline hover:text-accent">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
