'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { formatEur } from '@motive-fashion/utils';
import { BRAND, priceTaxSuffix } from '@motive-fashion/config';
import { BagDeliveryNote } from '@/components/bag-delivery';
import { CartLineRow } from '@/components/cart-line';
import { Icon } from '@/components/icons';
import { refreshCart, useCart } from '@/lib/cart-store';
import { refreshDelivery } from '@/lib/delivery';
import { isAuthPath, canShop } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

const PANEL_MS = 320;

export function CartBoot() {
  const pathname = usePathname();
  const { me, loading } = useSession();
  useEffect(() => {
    if (pathname.startsWith('/order/')) return;
    if (loading) return;
    if (!canShop(me)) return;
    void refreshCart();
  }, [pathname, me, loading]);
  useEffect(() => {
    void refreshDelivery();
  }, []);
  return null;
}

function hideDock(pathname: string) {
  return (
    isAuthPath(pathname) ||
    pathname === '/cart' ||
    pathname.startsWith('/checkout') ||
    pathname.startsWith('/order/')
  );
}

function itemLabel(count: number) {
  return `${count} ${count === 1 ? 'item' : 'items'}`;
}

export function HeaderCartButton() {
  const pathname = usePathname();
  const { me } = useSession();
  const { count, open } = useCart();
  if (!canShop(me) || hideDock(pathname)) return null;
  return (
    <button
      type="button"
      className="relative flex h-11 w-11 items-center justify-center rounded-lg md:hidden"
      aria-label={`Cart, ${itemLabel(count)}`}
      onClick={open}
    >
      <Icon name="cart" className="h-5 w-5" />
      {count ? (
        <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-medium text-primary">
          {count}
        </span>
      ) : null}
    </button>
  );
}

export function MiniCart() {
  const pathname = usePathname();
  const { me } = useSession();
  const { cart, isOpen, loading, count, open, close, setQty, removeItem } = useCart();
  const items = cart?.items ?? [];
  const subtotal = cart?.subtotalCents ?? 0;
  const [mounted, setMounted] = useState(isOpen);
  const [shown, setShown] = useState(false);
  const showDock = canShop(me) && !hideDock(pathname) && !mounted;

  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setShown(true));
      });
      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }
    setShown(false);
    const timer = window.setTimeout(() => setMounted(false), PANEL_MS);
    return () => window.clearTimeout(timer);
  }, [isOpen]);

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

  return (
    <>
      {showDock ? (
        <button
          type="button"
          className="fixed right-0 top-1/2 z-50 hidden w-12 -translate-y-1/2 flex-col overflow-hidden rounded-l-2xl bg-primary text-cream shadow-lg md:flex md:w-[5.75rem]"
          aria-label={`Cart, ${itemLabel(count)}, ${formatEur(subtotal)}`}
          aria-haspopup="dialog"
          onClick={open}
        >
          <span className="flex flex-col items-center gap-1 px-1 py-2.5 md:gap-1.5 md:px-2 md:py-3">
            <Icon name="cart" className="h-6 w-6 text-accent md:h-8 md:w-8" />
            <span className="text-[10px] font-medium tabular-nums md:text-xs">
              <span className="md:hidden">{count}</span>
              <span className="hidden md:inline">{itemLabel(count)}</span>
            </span>
          </span>
          <span className="hidden bg-ink/35 px-2 py-2 text-center text-xs font-medium tabular-nums md:block">
            {formatEur(subtotal)}
          </span>
        </button>
      ) : null}

      {mounted ? (
        <div className="fixed inset-0 z-[60]">
          <button
            type="button"
            className={`absolute inset-0 bg-ink/40 transition-opacity duration-300 ease-out motion-reduce:transition-none ${shown ? 'opacity-100' : 'opacity-0'}`}
            aria-label="Close cart"
            onClick={close}
          />
          <aside
            className={`absolute inset-y-0 right-0 flex h-dvh w-full max-w-md flex-col bg-white shadow-xl transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] motion-reduce:transition-none ${shown ? 'translate-x-0' : 'translate-x-full'}`}
          >
            <div className="flex items-start justify-between gap-3 border-b border-ink/10 px-5 py-4 pt-[max(1rem,env(safe-area-inset-top))]">
              <div className="flex min-w-0 items-start gap-3">
                <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-accent">
                  <Icon name="cart" className="h-5 w-5" />
                </span>
                <div>
                  <p className="font-serif text-2xl">
                    <span className="font-sans tabular-nums">{count}</span>
                    {count === 1 ? ' item' : ' items'}
                  </p>
                  <p className="mt-1 text-xs text-ink/55">Held for {BRAND.reservationMinutes} minutes.</p>
                </div>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-ink/70 hover:text-ink"
                aria-label="Close cart"
                onClick={close}
              >
                <Icon name="chevronRight" className="h-5 w-5" />
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              {loading && !cart ? <p className="text-sm text-ink/70">Loading…</p> : null}
              {!loading && items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center px-6 text-center">
                  <Icon name="cart" className="h-10 w-10 text-ink/25" />
                  <p className="mt-4 font-serif text-xl">Your bag is empty</p>
                  <p className="mt-2 text-sm text-ink/70">Start with the shop edit.</p>
                  <Link
                    href="/shop"
                    className="mt-6 inline-flex min-h-11 items-center rounded-full bg-primary px-5 py-2.5 text-sm text-cream no-underline"
                    onClick={close}
                  >
                    Shop the edit
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
                      onRecover={(row) => void setQty(row.id, row.quantity)}
                    />
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="border-t border-ink/10 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {items.length ? (
                <>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-ink/70">Subtotal{priceTaxSuffix()}</span>
                    <span className="font-medium tabular-nums">{formatEur(subtotal)}</span>
                  </div>
                  <div className="mt-3">
                    <BagDeliveryNote subtotalCents={subtotal} showFeeLine />
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
                    Review bag
                  </Link>
                </>
              ) : (
                <BagDeliveryNote subtotalCents={0} />
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
