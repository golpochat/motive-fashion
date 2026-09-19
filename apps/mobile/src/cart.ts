import { api } from './api';
import { getCartId, getSessionKey, setCartId } from './session';

export type MobileCartLine = {
  id: string;
  variantId: string;
  title: string;
  size: string;
  color: string;
  quantity: number;
  unitPriceCents: number;
  imageUrl?: string | null;
  reserved?: boolean;
  available?: number;
};

export type MobileCart = {
  id: string;
  items: MobileCartLine[];
  subtotalCents: number;
  expiresAt: string | null;
};

async function cartQuery() {
  const sessionKey = getSessionKey();
  const params = new URLSearchParams({ sessionKey });
  const id = getCartId();
  if (id) params.set('cartId', id);
  return { sessionKey, params, id };
}

export async function loadCart() {
  const { params } = await cartQuery();
  const cart = await api<MobileCart>(`/cart?${params.toString()}`);
  setCartId(cart.id);
  return cart;
}

export async function ensureCart() {
  const { sessionKey, id } = await cartQuery();
  if (id) {
    try {
      return await loadCart();
    } catch {
      /* create */
    }
  }
  const created = await api<MobileCart>(`/cart?sessionKey=${encodeURIComponent(sessionKey)}`, undefined, {
    method: 'POST',
  });
  setCartId(created.id);
  return created;
}

export async function addToBag(variantId: string, quantity = 1) {
  const cart = await ensureCart();
  const sessionKey = getSessionKey();
  const next = await api<MobileCart>(
    `/cart/${cart.id}/items?sessionKey=${encodeURIComponent(sessionKey)}`,
    undefined,
    { method: 'POST', body: JSON.stringify({ variantId, quantity }) },
  );
  setCartId(next.id);
  return next;
}

export async function setLineQty(itemId: string, quantity: number) {
  const cart = await ensureCart();
  const sessionKey = getSessionKey();
  const next = await api<MobileCart>(
    `/cart/${cart.id}/items/${itemId}?sessionKey=${encodeURIComponent(sessionKey)}`,
    undefined,
    { method: 'POST', body: JSON.stringify({ quantity }) },
  );
  setCartId(next.id);
  return next;
}

export async function removeLine(itemId: string) {
  const cart = await ensureCart();
  const sessionKey = getSessionKey();
  const next = await api<MobileCart>(
    `/cart/${cart.id}/items/${itemId}?sessionKey=${encodeURIComponent(sessionKey)}`,
    undefined,
    { method: 'DELETE' },
  );
  setCartId(next.id);
  return next;
}
