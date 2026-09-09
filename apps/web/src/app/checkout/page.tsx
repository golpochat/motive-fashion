'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { addressLabelName, formatIrelandAddress, isValidEircode, normalizeEircode, BRAND } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { API, apiErrorMessage, cartSessionKey } from '@/lib/api';
import { useCart } from '@/lib/cart-store';
import { useSession } from '@/components/session-provider';
import { Field, fieldClass, Select } from '@/components/dashboard-ui';
import { IrelandAddressFields, validateIrelandAddress, type AddressFieldErrors } from '@/components/ireland-address-fields';

const radioClass = 'h-4 w-4 shrink-0 accent-ink';

type Fulfilment = {
  id: string;
  code: 'DELIVERY' | 'COLLECTION';
  name: string;
  feeCents: number;
  freeOverCents: number | null;
};
type County = { id: string; code: string; name: string; rateCents: number };
type Payment = { id: string; code: string; name: string };
type Options = {
  blocked: string | null;
  fulfilment: Fulfilment[];
  payments: Payment[];
  counties: County[];
  defaultFulfilment: 'DELIVERY' | 'COLLECTION';
  returnNotice: string;
};
type Quote = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  countyRateCents: number | null;
  freeOverCents: number | null;
  shippingWaived: boolean;
  needsCounty: boolean;
};

export default function CheckoutPage() {
  const { cart, loading } = useCart();
  const { me } = useSession();
  const [options, setOptions] = useState<Options | null>(null);
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'COLLECTION'>('DELIVERY');
  const [addressId, setAddressId] = useState<string>('');
  const [county, setCounty] = useState('');
  const [promoInput, setPromoInput] = useState('');
  const [promo, setPromo] = useState('');
  const [quote, setQuote] = useState<Quote | null>(null);
  const [quoteError, setQuoteError] = useState('');
  const [ack, setAck] = useState(false);
  const [error, setError] = useState('');
  const [addressErrors, setAddressErrors] = useState<AddressFieldErrors>({});
  const [paying, setPaying] = useState(false);

  const addresses = me?.addresses ?? [];
  const usingNewAddress = !me || addressId === 'new' || addresses.length === 0;
  const selectedAddress = addresses.find((a) => a.id === addressId);
  const quoteCounty = fulfillment === 'DELIVERY' ? (usingNewAddress ? county : selectedAddress?.county ?? county) : undefined;

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('cancelled')) {
      setError(`Payment was cancelled. Your cart is still reserved for ${BRAND.reservationMinutes} minutes.`);
    }
  }, []);

  useEffect(() => {
    fetch(`${API}/checkout/options`)
      .then((r) => r.json() as Promise<Options>)
      .then((data) => {
        setOptions(data);
        setFulfillment(data.defaultFulfilment);
      })
      .catch(() => setError('Could not load checkout options'));
  }, []);

  useEffect(() => {
    if (!me) {
      setAddressId('');
      return;
    }
    const preferred = me.addresses?.find((a) => a.isDefault) ?? me.addresses?.[0];
    setAddressId(preferred?.id ?? 'new');
    if (preferred?.county) setCounty(preferred.county);
  }, [me]);

  useEffect(() => {
    if (selectedAddress?.county) setCounty(selectedAddress.county);
  }, [selectedAddress?.county]);

  useEffect(() => {
    if (!cart?.id || !options || options.blocked) {
      setQuote(null);
      return;
    }
    const controller = new AbortController();
    const body = {
      cartId: cart.id,
      sessionKey: cartSessionKey(),
      fulfillment,
      county: quoteCounty || undefined,
      promoCode: promo || undefined,
    };
    fetch(`${API}/checkout/quote`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
      signal: controller.signal,
    })
      .then(async (res) => {
        const data = (await res.json()) as Quote & { message?: string };
        if (!res.ok) {
          setQuoteError(apiErrorMessage(data, 'Could not quote this cart'));
          if (promo) setPromo('');
          return;
        }
        setQuoteError('');
        setQuote(data);
      })
      .catch((err: unknown) => {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        setQuoteError('Could not quote this cart');
      });
    return () => controller.abort();
  }, [cart?.id, cart?.subtotalCents, fulfillment, quoteCounty, promo, options]);

  const deliveryOn = options?.fulfilment.some((m) => m.code === 'DELIVERY') ?? false;
  const showFulfilmentChoice = (options?.fulfilment.length ?? 0) > 1;
  const showAddress = fulfillment === 'DELIVERY' && deliveryOn;
  const cardOk = options?.payments.some((p) => p.code === 'CARD');
  const deliveryMethod = options?.fulfilment.find((m) => m.code === 'DELIVERY');

  const countyLabel = useMemo(() => {
    const row = options?.counties.find((c) => c.code === quoteCounty);
    return row?.name ?? quoteCounty;
  }, [options?.counties, quoteCounty]);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!cart?.id) {
      setError('Cart is empty');
      return;
    }
    if (!ack) {
      setError('Please confirm the returns policy');
      return;
    }
    const form = new FormData(e.currentTarget);
    if (showAddress && usingNewAddress) {
      const local = validateIrelandAddress(form);
      setAddressErrors(local);
      if (Object.keys(local).length) {
        setError('');
        return;
      }
    } else {
      setAddressErrors({});
    }
    if (showAddress && !usingNewAddress && selectedAddress && !isValidEircode(selectedAddress.eircode ?? '')) {
      setError('This address needs a valid Eircode. Update it under Addresses.');
      return;
    }
    setPaying(true);
    setError('');
    const payload: Record<string, unknown> = {
      cartId: cart.id,
      sessionKey: cartSessionKey(),
      fulfillment,
      email: me?.email ?? String(form.get('email')),
      name: me?.name ?? String(form.get('name')),
      phone: String(form.get('phone') || '') || undefined,
      giftNote: String(form.get('giftNote') || '') || undefined,
      promoCode: promo || undefined,
      paymentMethod: 'CARD',
      returnPolicyAck: true,
    };
    if (fulfillment === 'DELIVERY') {
      if (!usingNewAddress && addressId) {
        payload.addressId = addressId;
        payload.county = quoteCounty;
      } else {
        payload.address = {
          label: String(form.get('label') || 'HOME'),
          line1: String(form.get('line1')),
          line2: String(form.get('line2') || '') || undefined,
          city: String(form.get('city')),
          county,
          eircode: normalizeEircode(String(form.get('eircode') || '')),
          country: 'IE',
        };
      }
    }
    const orderRes = await fetch(`${API}/checkout/session`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const order = (await orderRes.json()) as { id?: string; trackingToken?: string; message?: string };
    if (!orderRes.ok || !order.id) {
      setPaying(false);
      setError(apiErrorMessage(order, 'Checkout could not start. Check the details and try again.'));
      return;
    }
    const payRes = await fetch(
      `${API}/checkout/${order.id}/pay?token=${encodeURIComponent(order.trackingToken ?? '')}`,
      { method: 'POST', credentials: 'include' },
    );
    const pay = (await payRes.json()) as { url?: string; message?: string };
    if (pay.url) {
      window.location.href = pay.url;
      return;
    }
    setPaying(false);
    setError(pay.message ?? 'Payment could not start');
  }

  if (loading && !cart) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Checkout</h1>
        <p className="mt-4 text-ink/70">Loading…</p>
      </div>
    );
  }

  if (!cart?.items.length) {
    return (
      <div>
        <h1 className="font-serif text-4xl">Checkout</h1>
        <p className="mt-4 text-ink/70">Your cart is empty.</p>
        <Link href="/shop" className="mt-6 inline-block rounded-full bg-primary px-6 py-3 text-cream no-underline">
          Continue shopping
        </Link>
      </div>
    );
  }

  return (
    <form noValidate onSubmit={onSubmit} className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <div className="lg:col-span-2">
        <h1 className="font-serif text-4xl">Checkout</h1>
        <p className="mt-2 text-sm text-ink/70">
          Prices include VAT ({(BRAND.vatRate * 100).toFixed(0)}%). Ireland only. See <Link href="/legal/returns">returns</Link>.
        </p>
      </div>
      <div className="space-y-6 max-lg:order-last lg:col-start-1 lg:row-start-2">
        {!me ? (
          <div className="rounded-2xl border border-ink/10 bg-white p-4 text-sm">
            <p className="font-medium">Pay as a guest</p>
            <p className="mt-1 text-ink/70">No account needed. Fill in your details below.</p>
            <p className="mt-3 text-ink/70">
              Already have an account?{' '}
              <Link href="/account?next=/checkout">Sign in</Link> to use a saved address.
            </p>
          </div>
        ) : null}
        {options?.blocked ? <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-800">{options.blocked}</p> : null}

        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Contact</h2>
          {me ? (
            <>
              <p className="text-sm">
                Checking out as <span className="text-ink">{me.name}</span>
                <span className="text-ink/55"> · {me.email}</span>
              </p>
              <label className="block">
                <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Phone</span>
                <input name="phone" defaultValue={me.phone ?? ''} autoComplete="tel" className={fieldClass} />
                <span className="mt-1.5 block text-xs text-ink/55">Optional. Used if we need to reach you about this order.</span>
              </label>
            </>
          ) : (
            <>
              <Field label="Name">
                <input name="name" required autoComplete="name" className={fieldClass} />
              </Field>
              <Field label="Email">
                <input name="email" type="email" required autoComplete="email" className={fieldClass} />
              </Field>
              <Field label="Phone">
                <input name="phone" autoComplete="tel" className={fieldClass} />
                <span className="mt-1.5 block text-xs text-ink/55">Optional. Used if we need to reach you about this order.</span>
              </Field>
            </>
          )}
        </section>

        {options && !options.blocked ? (
          <section className="space-y-3">
            <h2 className="font-serif text-2xl">Fulfilment</h2>
            {showFulfilmentChoice ? (
              <fieldset className="flex flex-col gap-2">
                {options.fulfilment.map((method) => (
                  <label key={method.id} className="flex min-h-11 items-center gap-2 text-sm">
                    <input
                      type="radio"
                      className={radioClass}
                      checked={fulfillment === method.code}
                      onChange={() => setFulfillment(method.code)}
                    />
                    {method.name}
                  </label>
                ))}
              </fieldset>
            ) : (
              <p className="text-sm text-ink/70">{options.fulfilment[0]?.name}</p>
            )}
          </section>
        ) : null}

        {showAddress ? (
          <section className="space-y-3">
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-serif text-2xl">Delivery address</h2>
              {me ? (
                <Link href="/user/addresses" className="text-sm">
                  Manage addresses
                </Link>
              ) : null}
            </div>
            {addresses.length > 0 ? (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <label key={addr.id} className="flex items-start gap-2 rounded-xl border border-ink/10 p-3 text-sm">
                    <input type="radio" className={`${radioClass} mt-0.5`} checked={addressId === addr.id} onChange={() => setAddressId(addr.id)} />
                    <span>
                      <span className="block">
                        {addressLabelName(addr.label) || 'Address'}
                        {addr.isDefault ? <span className="text-ink/45"> · Default</span> : null}
                      </span>
                      <span className="mt-1 block text-ink/70">{formatIrelandAddress(addr)}</span>
                    </span>
                  </label>
                ))}
                <label className="flex min-h-11 items-center gap-2 text-sm">
                  <input type="radio" className={radioClass} checked={addressId === 'new'} onChange={() => setAddressId('new')} />
                  Use a different address
                </label>
              </div>
            ) : null}
            {usingNewAddress ? (
              <IrelandAddressFields
                counties={options?.counties ?? []}
                county={county}
                onCountyChange={setCounty}
                showLabel={Boolean(me)}
                errors={addressErrors}
              />
            ) : selectedAddress && !selectedAddress.county ? (
              <Select
                name="county"
                required
                value={county}
                onChange={setCounty}
                placeholder="County"
                sortLabels
                className={fieldClass}
                options={(options?.counties ?? []).map((row) => ({ value: row.code, label: row.name }))}
              />
            ) : null}
          </section>
        ) : null}

        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Promo</h2>
          <div>
            <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Promo code</span>
            <div className="flex gap-2">
              <input
                value={promoInput}
                onChange={(e) => setPromoInput(e.target.value)}
                autoComplete="off"
                className={fieldClass}
              />
              <button
                type="button"
                className="min-h-11 shrink-0 rounded-xl border border-ink/15 px-4 py-2 text-sm"
                onClick={() => setPromo(promoInput.trim().toUpperCase())}
              >
                Apply
              </button>
            </div>
          </div>
          {promo && !quoteError ? <p className="text-sm text-ink/70">Applied {promo}</p> : null}
        </section>

        <section className="space-y-3">
          <h2 className="font-serif text-2xl">Gift note</h2>
          <textarea name="giftNote" rows={3} aria-label="Gift note" className={fieldClass} />
          <p className="text-xs text-ink/55">Optional. Printed with the order.</p>
        </section>

        {options?.returnNotice ? (
          <label className="flex items-start gap-3 text-sm leading-relaxed">
            <input type="checkbox" checked={ack} onChange={(e) => setAck(e.target.checked)} className="mt-1 accent-ink" />
            <span>
              {options.returnNotice}{' '}
              <Link href="/legal/returns">Full returns policy</Link>.
            </span>
          </label>
        ) : null}

        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {quoteError ? <p className="text-sm text-red-700">{quoteError}</p> : null}

        <div className="space-y-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-ink/70">
              Total inc. VAT {quote ? formatEur(quote.totalCents) : formatEur(cart.subtotalCents)}
            </p>
            <button
              className="rounded-full bg-primary px-6 py-3 text-cream disabled:opacity-50"
              type="submit"
              disabled={Boolean(options?.blocked) || !cardOk || !ack || paying}
            >
              {paying ? 'Starting payment…' : 'Pay with card'}
            </button>
          </div>
          <p className="text-xs text-ink/55">
            Card payment is processed by Stripe. We never store full card numbers. Your cart is reserved for{' '}
            {BRAND.reservationMinutes} minutes.
          </p>
        </div>
      </div>

      <aside className="h-fit space-y-4 rounded-2xl border border-ink/10 bg-white p-5 lg:col-start-2 lg:row-start-2 lg:sticky lg:top-24">
        <h2 className="font-serif text-2xl">Order</h2>
        <ul className="divide-y divide-ink/10 text-sm">
          {cart.items.map((item) => (
            <li key={item.id} className="flex justify-between gap-3 py-2">
              <span>
                {item.title} × {item.quantity}
                <span className="block text-ink/55">
                  {item.size} / {item.color}
                  <span className="text-ink/55"> · {formatEur(item.unitPriceCents)} each</span>
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatEur(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>
        {quote ? (
          <dl className="space-y-1 text-sm">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>{formatEur(quote.subtotalCents)}</dd>
            </div>
            {quote.discountCents > 0 ? (
              <div className="flex justify-between">
                <dt>Discount</dt>
                <dd>−{formatEur(quote.discountCents)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Delivery</dt>
              <dd>
                {fulfillment === 'COLLECTION'
                  ? formatEur(quote.shippingCents)
                  : quote.needsCounty
                    ? 'Select a county'
                    : quote.shippingWaived
                      ? 'Free'
                      : formatEur(quote.shippingCents)}
              </dd>
            </div>
            <div className="flex justify-between pt-2 text-base">
              <dt>Total inc. VAT</dt>
              <dd>{formatEur(quote.totalCents)}</dd>
            </div>
          </dl>
        ) : (
          <p className="text-sm text-ink/70">Subtotal {formatEur(cart.subtotalCents)}</p>
        )}
        {fulfillment === 'DELIVERY' && deliveryMethod?.freeOverCents && quote?.countyRateCents != null ? (
          <p className="text-xs text-ink/55">
            {countyLabel} rate {formatEur(quote.countyRateCents)}. Free over {formatEur(deliveryMethod.freeOverCents)}.
          </p>
        ) : null}
      </aside>
    </form>
  );
}
