'use client';

import { FormEvent, useEffect, useState } from 'react';
import { API, cartSessionKey } from '@/lib/api';

export default function CheckoutPage() {
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'COLLECTION'>('COLLECTION');
  const [error, setError] = useState('');

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cancelled')) {
      setError('Payment was cancelled. Your cart is still reserved for 15 minutes.');
    }
  }, []);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const cartId = localStorage.getItem('mf_cart');
    if (!cartId) {
      setError('Cart is empty');
      return;
    }
    const payload = {
      cartId,
      sessionKey: cartSessionKey(),
      fulfillment,
      email: String(form.get('email')),
      name: String(form.get('name')),
      phone: String(form.get('phone')),
      giftNote: String(form.get('giftNote') || ''),
      address:
        fulfillment === 'DELIVERY'
          ? {
              line1: String(form.get('line1')),
              city: String(form.get('city')),
              eircode: String(form.get('eircode') || ''),
              country: 'IE',
            }
          : undefined,
    };
    const orderRes = await fetch(`${API}/checkout/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const order = (await orderRes.json()) as { id?: string; trackingToken?: string; message?: string };
    if (!orderRes.ok || !order.id) {
      setError(typeof order.message === 'string' ? order.message : 'Checkout failed');
      return;
    }
    const payRes = await fetch(
      `${API}/checkout/${order.id}/pay?token=${encodeURIComponent(order.trackingToken ?? '')}`,
      {
        method: 'POST',
        credentials: 'include',
      },
    );
    const pay = (await payRes.json()) as { url?: string; message?: string };
    if (pay.url) window.location.href = pay.url;
    else setError(pay.message ?? JSON.stringify(pay));
  }

  return (
    <form onSubmit={onSubmit} className="mx-auto max-w-lg space-y-4">
      <h1 className="font-serif text-4xl">Checkout</h1>
      <p className="text-sm text-ink/70">
        Guest checkout is available. Prices include VAT (23%). 14-day cooling-off after delivery or collection. Unworn
        items with tags.
      </p>
      <input name="name" required placeholder="Name" className="w-full rounded-xl border px-3 py-2" />
      <input name="email" type="email" required placeholder="Email" className="w-full rounded-xl border px-3 py-2" />
      <input name="phone" placeholder="Phone" className="w-full rounded-xl border px-3 py-2" />
      <fieldset className="flex gap-4">
        <label>
          <input
            type="radio"
            checked={fulfillment === 'COLLECTION'}
            onChange={() => setFulfillment('COLLECTION')}
          />{' '}
          Collect in Dublin
        </label>
        <label>
          <input
            type="radio"
            checked={fulfillment === 'DELIVERY'}
            onChange={() => setFulfillment('DELIVERY')}
          />{' '}
          Ireland delivery
        </label>
      </fieldset>
      {fulfillment === 'DELIVERY' ? (
        <>
          <input name="line1" required placeholder="Address" className="w-full rounded-xl border px-3 py-2" />
          <input name="city" required placeholder="City" className="w-full rounded-xl border px-3 py-2" />
          <input name="eircode" placeholder="Eircode" className="w-full rounded-xl border px-3 py-2" />
        </>
      ) : null}
      <textarea name="giftNote" placeholder="Gift note (optional)" className="w-full rounded-xl border px-3 py-2" />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button className="rounded-full bg-ink px-6 py-3 text-cream" type="submit">
        Pay with Stripe
      </button>
    </form>
  );
}
