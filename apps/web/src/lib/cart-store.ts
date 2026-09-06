import { useCallback, useSyncExternalStore } from 'react';
import { API, cartSessionKey } from '@/lib/api';

export type CartLine = {
  id: string;
  variantId: string;
  sku: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
};

export type Cart = {
  id: string;
  items: CartLine[];
  subtotalCents: number;
  expiresAt: string | null;
};

type Snapshot = { cart: Cart | null; loading: boolean; open: boolean };

let snapshot: Snapshot = { cart: null, loading: true, open: false };
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function setSnapshot(next: Partial<Snapshot>) {
  snapshot = { ...snapshot, ...next };
  emit();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const serverSnapshot: Snapshot = { cart: null, loading: true, open: false };

function qs() {
  const sessionKey = cartSessionKey();
  const params = new URLSearchParams({ sessionKey });
  const id = localStorage.getItem('mf_cart');
  if (id) params.set('cartId', id);
  return { sessionKey, params };
}

function remember(cart: Cart | null) {
  if (cart?.id) localStorage.setItem('mf_cart', cart.id);
  return cart;
}

export async function refreshCart() {
  try {
    const { params } = qs();
    const res = await fetch(`${API}/cart?${params.toString()}`, { credentials: 'include' });
    const next = res.ok ? ((await res.json()) as Cart) : null;
    setSnapshot({ cart: remember(next), loading: false });
    return next;
  } catch {
    setSnapshot({ cart: null, loading: false });
    return null;
  }
}

export async function addCartItem(variantId: string, quantity = 1) {
  const { sessionKey, params } = qs();
  let cartId = localStorage.getItem('mf_cart');
  if (!cartId) {
    const created = await fetch(`${API}/cart?${params.toString()}`, {
      method: 'POST',
      credentials: 'include',
    }).then((r) => r.json() as Promise<Cart>);
    cartId = created.id;
    localStorage.setItem('mf_cart', cartId);
  }
  const res = await fetch(
    `${API}/cart/${cartId}/items?sessionKey=${encodeURIComponent(sessionKey)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ variantId, quantity }),
    },
  );
  if (!res.ok) throw new Error('Could not add to cart');
  const next = (await res.json()) as Cart;
  setSnapshot({ cart: remember(next), loading: false, open: true });
  return next;
}

export async function setCartQty(itemId: string, quantity: number) {
  const cart = snapshot.cart;
  if (!cart) return null;
  const { sessionKey } = qs();
  const res = await fetch(
    `${API}/cart/${cart.id}/items/${itemId}?sessionKey=${encodeURIComponent(sessionKey)}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity }),
    },
  );
  if (!res.ok) throw new Error('Could not update cart');
  const next = (await res.json()) as Cart;
  setSnapshot({ cart: remember(next) });
  return next;
}

export async function removeCartItem(itemId: string) {
  const cart = snapshot.cart;
  if (!cart) return null;
  const { sessionKey } = qs();
  const res = await fetch(
    `${API}/cart/${cart.id}/items/${itemId}?sessionKey=${encodeURIComponent(sessionKey)}`,
    { method: 'DELETE', credentials: 'include' },
  );
  if (!res.ok) throw new Error('Could not remove item');
  const next = (await res.json()) as Cart;
  setSnapshot({ cart: remember(next) });
  return next;
}

export function openMiniCart() {
  setSnapshot({ open: true });
}

export function closeMiniCart() {
  setSnapshot({ open: false });
}

/** Empty the local bag only when it is the cart that just became this order. */
export async function releasePaidCart(orderCartId?: string | null) {
  const localId = localStorage.getItem('mf_cart');
  if (!orderCartId || localId !== orderCartId) return;
  localStorage.removeItem('mf_cart');
  setSnapshot({
    cart: { id: orderCartId, items: [], subtotalCents: 0, expiresAt: null },
    loading: false,
    open: false,
  });
}

export function cartCount(cart: Cart | null) {
  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function useCart() {
  const state = useSyncExternalStore(subscribe, () => snapshot, () => serverSnapshot);
  const refresh = useCallback(() => refreshCart(), []);
  const open = useCallback(() => openMiniCart(), []);
  const close = useCallback(() => closeMiniCart(), []);
  return {
    cart: state.cart,
    loading: state.loading,
    isOpen: state.open,
    count: cartCount(state.cart),
    refresh,
    open,
    close,
    addItem: addCartItem,
    setQty: setCartQty,
    removeItem: removeCartItem,
  };
}
