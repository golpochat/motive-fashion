'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { formatEur } from '@motive-fashion/utils';
import { BRAND, priceTaxSuffix } from '@motive-fashion/config';
import { BagDeliveryNote } from '@/components/bag-delivery';
import { CartLineRow } from '@/components/cart-line';
import { useSession } from '@/components/session-provider';
import { useCart, cartHoldExpired, cartNeedsRecovery } from '@/lib/cart-store';
import { authHref, canShop, homePath } from '@/lib/rbac';

export default function CartPage() {
  const { cart, loading, setQty, removeItem, close } = useCart();
  const { me } = useSession();

  useEffect(() => {
    close();
  }, [close]);

  if (me && !canShop(me)) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Cart</h1>
        <p className="mt-4 text-ink/70">Only a customer account can place a shop order. Take a sale on the till, or sign out to shop as a guest.</p>
        <Link href={homePath(me)} className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-cream no-underline">
          Open your workspace
        </Link>
      </div>
    );
  }

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

  const holdExpired = cartHoldExpired(cart);
  const needsRecovery = cartNeedsRecovery(cart);

  return (
    <div>
      <h1 className="font-serif text-4xl">Cart</h1>
      <p className="mt-2 text-sm text-ink/70">Reserved for {BRAND.reservationMinutes} minutes.</p>
      {holdExpired || needsRecovery ? (
        <p className="mt-4 rounded-2xl border border-ink/15 bg-white p-4 text-sm" role="status">
          {holdExpired
            ? 'The reservation window ended. Reserve lines again, or remove anything that is sold out.'
            : 'A size or colour in this bag is no longer available. Remove it or pick another on the product page.'}
        </p>
      ) : null}
      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <ul className="divide-y divide-ink/10 border-y border-ink/10">
          {cart.items.map((item) => (
            <CartLineRow
              key={item.id}
              item={item}
              onQty={(id, qty) => void setQty(id, qty)}
              onRemove={(id) => void removeItem(id)}
              onRecover={(row) => void setQty(row.id, row.quantity)}
            />
          ))}
        </ul>
        <aside className="h-fit space-y-4 rounded-2xl border border-ink/10 bg-white p-5 lg:sticky lg:top-24">
          <div className="flex items-center justify-between text-sm">
            <span className="text-ink/70">Subtotal{priceTaxSuffix()}</span>
            <span className="font-medium tabular-nums">{formatEur(cart.subtotalCents)}</span>
          </div>
          <BagDeliveryNote subtotalCents={cart.subtotalCents} showFeeLine />
          <Link href="/checkout" className="block rounded-full bg-primary px-5 py-3 text-center text-sm text-cream no-underline">
            Checkout
          </Link>
          {!me ? (
            <p className="text-center text-xs text-ink/55">
              Pay as a guest, or{' '}
              <Link href={authHref('/auth/login', '/checkout')} className="text-ink/70 hover:text-accent">
                sign in
              </Link>
              .
            </p>
          ) : null}
          <Link href="/shop" className="block min-h-11 py-2.5 text-center text-sm text-ink/70 no-underline hover:text-accent">
            Continue shopping
          </Link>
        </aside>
      </div>
    </div>
  );
}
