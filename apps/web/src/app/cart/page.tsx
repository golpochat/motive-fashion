'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API, cartSessionKey } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

type Cart = {
  id: string;
  items: { id: string; title: string; size: string; color: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const id = localStorage.getItem('mf_cart');
    const sessionKey = cartSessionKey();
    const qs = new URLSearchParams({ sessionKey });
    if (id) qs.set('cartId', id);
    fetch(`${API}/cart?${qs.toString()}`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((next: Cart | null) => {
        if (next?.id) localStorage.setItem('mf_cart', next.id);
        setCart(next);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Cart</h1>
        <p className="mt-4">Loading…</p>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Cart</h1>
        <p className="mt-4">Your cart is empty.</p>
        <Link href="/shop">Continue shopping</Link>
      </div>
    );
  }

  return (
    <div>
      <h1 className="font-serif text-4xl">Cart</h1>
      <ul className="mt-8 space-y-4">
        {cart.items.map((item) => (
          <li key={item.id} className="flex justify-between border-b border-ink/10 py-3">
            <span>
              {item.title} · {item.size}/{item.color} × {item.quantity}
            </span>
            <span>{formatEur(item.unitPriceCents * item.quantity)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 text-lg">Subtotal {formatEur(cart.subtotalCents)} inc. VAT</p>
      <Link href="/checkout" className="mt-6 inline-block rounded-full bg-ink px-6 py-3 text-cream no-underline">
        Checkout
      </Link>
    </div>
  );
}
