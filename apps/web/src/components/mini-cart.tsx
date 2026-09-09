'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatEur } from '@motive-fashion/utils';
import { BRAND } from '@motive-fashion/config';
import { CartLineRow } from '@/components/cart-line';
import { Icon } from '@/components/icons';
import { refreshCart, useCart } from '@/lib/cart-store';

export function CartBoot() {
  const pathname = usePathname();
  useEffect(() => {
    if (pathname.startsWith('/order/')) return;
    void refreshCart();
  }, [pathname]);
  return null;
}

export function MiniCart() {
  const { cart, isOpen, loading, close, setQty, removeItem } = useCart();
  const items = cart?.items ?? [];

  useEffect(() => {
    if (!isOpen) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.body.classList.add('overflow-hidden');
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.classList.remove('overflow-hidden');
      document.removeEventListener('keydown', onKey);
    };
  }, [isOpen, close]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60]">
      <button type="button" className="absolute inset-0 bg-primary/40" aria-label="Close cart" onClick={close} />
      <aside className="absolute inset-y-0 right-0 flex h-dvh w-full max-w-md flex-col bg-surface shadow-xl">
        <div className="flex items-center justify-between border-b border-ink/10 px-5 py-4">
          <div>
            <p className="font-serif text-2xl">Cart</p>
            <p className="mt-1 text-xs text-ink/55">Reserved for {BRAND.reservationMinutes} minutes.</p>
          </div>
          <button
            type="button"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-ink/15"
            aria-label="Close cart"
            onClick={close}
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading && !cart ? <p className="text-sm text-ink/70">Loading…</p> : null}
          {!loading && items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-6 text-center">
              <Icon name="cart" className="h-10 w-10 text-ink/25" />
              <p className="mt-4 font-serif text-xl">Your cart is empty</p>
              <p className="mt-2 text-sm text-ink/70">Start with the shop edit.</p>
              <Link
                href="/shop"
                className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2.5 text-sm text-cream no-underline"
                onClick={close}
              >
                Shop modest wear
              </Link>
            </div>
          ) : null}
          {items.length ? (
            <ul className="divide-y divide-ink/10">
              {items.map((item) => (
                <CartLineRow
                  key={item.id}
                  item={item}
                  compact
                  onQty={(id, qty) => void setQty(id, qty)}
                  onRemove={(id) => void removeItem(id)}
                />
              ))}
            </ul>
          ) : null}
        </div>

        {items.length ? (
          <div className="border-t border-ink/10 px-5 py-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-ink/70">Subtotal inc. VAT</span>
              <span className="font-medium">{formatEur(cart?.subtotalCents ?? 0)}</span>
            </div>
            <Link
              href="/checkout"
              className="mt-4 block rounded-full bg-primary px-5 py-3 text-center text-sm text-cream no-underline"
              onClick={close}
            >
              Checkout
            </Link>
            <Link
              href="/cart"
              className="mt-2 block min-h-11 py-2.5 text-center text-sm text-ink/70 no-underline hover:text-accent"
              onClick={close}
            >
              View cart
            </Link>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
