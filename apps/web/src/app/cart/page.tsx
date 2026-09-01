'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

type Cart = {
  id: string;
  items: { id: string; title: string; size: string; color: string; quantity: number; unitPriceCents: number }[];
  subtotalCents: number;
};

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);

  useEffect(() => {
    const id = localStorage.getItem('mf_cart');
    if (!id) return;
    fetch(`${API}/cart?cartId=${id}`, { credentials: 'include' })
      .then((r) => r.json())
      .then(setCart)
      .catch(() => null);
  }, []);

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
