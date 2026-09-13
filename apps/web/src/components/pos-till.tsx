'use client';

import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { formatEur } from '@motive-fashion/utils';
import { isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { API, apiErrorMessage, type ProductCard } from '@/lib/api';
import { catalogPriceLabel, groupVariantsBySize, variantPriceRange } from '@/lib/catalog';
import { Field, FilterTabs, Modal, PrimaryButton, QtyStepper, SecondaryButton, Select, fieldClass } from '@/components/dashboard-ui';

const LAST_ORDER_KEY = 'mf_pos_last_order';

type Category = { slug: string; name: string };
type Quote = {
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  needsCounty: boolean;
};
type BasketLine = {
  productTitle: string;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  available: number;
  quantity: number;
};

function eurosToCents(value: string) {
  const n = Number(value.replace(',', '.').trim());
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}

function PosVariantPicker({
  product,
  onPick,
}: {
  product: ProductCard;
  onPick: (sku: string) => void;
}) {
  const groups = groupVariantsBySize(product.variants);
  const showGroups = groups.length > 1;

  return (
    <div className={showGroups ? 'space-y-4' : 'grid grid-cols-2 gap-2'}>
      {groups.map(([size, variants]) => {
        const range = variantPriceRange(variants);
        return (
          <div key={size} className={showGroups ? 'space-y-2' : 'contents'}>
            {showGroups ? (
              <p className="text-xs uppercase tracking-wider text-ink/55">
                {size}
                <span className="ml-2 font-sans normal-case tracking-normal text-ink/70">
                  {range.mixed ? `from ${formatEur(range.min)}` : formatEur(range.min)}
                </span>
              </p>
            ) : null}
            <div className={showGroups ? 'grid grid-cols-2 gap-2' : 'contents'}>
              {variants.map((variant) => (
                <button
                  key={variant.sku}
                  type="button"
                  disabled={variant.available < 1}
                  onClick={() => onPick(variant.sku)}
                  className="rounded-xl border border-ink/15 px-3 py-2 text-left text-sm disabled:opacity-40"
                >
                  <span className="block font-medium">
                    {showGroups ? variant.color : `${variant.size} / ${variant.color}`}
                  </span>
                  <span className="text-ink/55">
                    {formatEur(variant.priceCents)} · {variant.available} left
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export function PosTill() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [category, setCategory] = useState('');
  const [query, setQuery] = useState('');
  const [products, setProducts] = useState<ProductCard[]>([]);
  const [picking, setPicking] = useState<ProductCard | null>(null);
  const [basket, setBasket] = useState<BasketLine[]>([]);
  const [name, setName] = useState('Walk-in');
  const [email, setEmail] = useState('');
  const [promo, setPromo] = useState('');
  const [fulfillment, setFulfillment] = useState<'COLLECTION' | 'DELIVERY'>('COLLECTION');
  const [payment, setPayment] = useState<'CASH' | 'CARD'>('CASH');
  const [tendered, setTendered] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [eircode, setEircode] = useState('');
  const [counties, setCounties] = useState<{ code: string; name: string }[]>([]);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [lastOrderId, setLastOrderId] = useState('');
  const [busy, setBusy] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const skuRef = useRef<HTMLInputElement>(null);

  const itemCount = basket.reduce((sum, line) => sum + line.quantity, 0);
  const totalCents = quote?.totalCents ?? basket.reduce((sum, line) => sum + line.priceCents * line.quantity, 0);
  const tenderedCents = eurosToCents(tendered);
  const changeCents = tenderedCents == null ? null : tenderedCents - totalCents;
  const deliveryOk =
    fulfillment === 'COLLECTION' ||
    (line1.trim().length >= 3 && city.trim().length >= 2 && Boolean(county) && isValidEircode(eircode));
  const canCharge =
    basket.length > 0 &&
    deliveryOk &&
    !busy &&
    (payment === 'CARD' || (tenderedCents != null && tenderedCents >= totalCents));
  const chargeHint = !basket.length
    ? 'Add a line'
    : !deliveryOk
      ? 'Need delivery details'
      : payment === 'CASH' && (tenderedCents == null || tenderedCents < totalCents)
        ? 'Tender cash'
        : null;

  const loadProducts = useCallback(async (slug: string, q: string) => {
    const params = new URLSearchParams();
    const trimmed = q.trim();
    if (trimmed) params.set('q', trimmed);
    else if (slug) params.set('category', slug);
    else return;
    const res = await fetch(`${API}/catalog/products?${params}`, { credentials: 'include' });
    const rows = (await res.json()) as ProductCard[];
    setProducts(Array.isArray(rows) ? rows : []);
  }, []);

  useEffect(() => {
    const stored = sessionStorage.getItem(LAST_ORDER_KEY);
    if (stored) setLastOrderId(stored);
    fetch(`${API}/catalog/categories`, { credentials: 'include' })
      .then((r) => r.json())
      .then((rows: Category[]) => {
        const list = Array.isArray(rows) ? rows : [];
        setCategories(list);
        if (list[0]) setCategory(list[0].slug);
      });
    fetch(`${API}/checkout/options`, { credentials: 'include' })
      .then((r) => r.json())
      .then((opts: { counties?: { code: string; name: string }[] }) => setCounties(opts.counties ?? []));

    const paid = new URLSearchParams(window.location.search).get('paid');
    if (!paid) return;
    sessionStorage.setItem(LAST_ORDER_KEY, paid);
    setLastOrderId(paid);
    setBusy(true);
    fetch(`${API}/admin/pos/print/${paid}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(async (res) => {
        const printed = (await res.json()) as { printed?: boolean; error?: string };
        if (!res.ok) throw new Error(apiErrorMessage(printed, 'Print failed.'));
        setNotice(printed.printed ? 'Printed on TM-T20III.' : `Not printed${printed.error ? `: ${printed.error}` : '.'}`);
        window.history.replaceState({}, '', window.location.pathname);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : 'Print failed.'))
      .finally(() => setBusy(false));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts(category, query).catch(() => setProducts([]));
    }, 200);
    return () => clearTimeout(timer);
  }, [category, query, loadProducts]);

  useEffect(() => {
    if (!basket.length) {
      setQuote(null);
      return;
    }
    const timer = setTimeout(() => {
      fetch(`${API}/channels/pos/quote`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lines: basket.map((line) => ({ sku: line.sku, quantity: line.quantity, unitPriceCents: line.priceCents })),
          fulfillment,
          county: fulfillment === 'DELIVERY' ? county : undefined,
          promoCode: promo.trim() || undefined,
        }),
      })
        .then((r) => r.json())
        .then((row: Quote & { message?: string }) => {
          if (typeof row.totalCents === 'number') setQuote(row);
        });
    }, 250);
    return () => clearTimeout(timer);
  }, [basket, fulfillment, county, promo]);

  function addVariant(product: ProductCard, sku: string) {
    const variant = product.variants.find((item) => item.sku === sku);
    if (!variant) return;
    setError('');
    if (variant.available < 1) {
      setError(`${variant.sku} is out of stock.`);
      return;
    }
    setBasket((current) => {
      const existing = current.find((line) => line.sku === variant.sku);
      const have = existing?.quantity ?? 0;
      const nextQty = Math.min(have + 1, variant.available);
      if (nextQty === have) return current;
      const line: BasketLine = {
        productTitle: product.title,
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        priceCents: variant.priceCents,
        available: variant.available,
        quantity: nextQty,
      };
      if (!existing) return [...current, line];
      return current.map((item) => (item.sku === variant.sku ? { ...item, quantity: nextQty } : item));
    });
    setPicking(null);
    queueMicrotask(() => skuRef.current?.focus());
  }

  function setQty(sku: string, quantity: number) {
    setBasket((current) => {
      if (quantity < 1) {
        const next = current.filter((item) => item.sku !== sku);
        if (!next.length) setSaleOpen(false);
        return next;
      }
      return current.map((item) =>
        item.sku === sku ? { ...item, quantity: Math.min(quantity, item.available) } : item,
      );
    });
  }

  async function onSearch(e: FormEvent) {
    e.preventDefault();
    const sku = query.trim();
    if (!sku) return;
    const res = await fetch(`${API}/catalog/products?sku=${encodeURIComponent(sku)}`, { credentials: 'include' });
    const rows = (await res.json()) as ProductCard[];
    const match = (Array.isArray(rows) ? rows : [])
      .flatMap((product) => product.variants.map((variant) => ({ product, variant })))
      .find((row) => row.variant.sku.toLowerCase() === sku.toLowerCase());
    if (match) {
      addVariant(match.product, match.variant.sku);
      setQuery('');
    }
  }

  async function printTicket(orderId: string, cash?: { tenderedCents: number; changeCents: number }) {
    const res = await fetch(`${API}/admin/pos/print/${orderId}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cash ?? {}),
    });
    const printed = (await res.json()) as { printed?: boolean; error?: string };
    if (!res.ok) throw new Error(apiErrorMessage(printed, 'Print failed.'));
    setNotice(printed.printed ? 'Printed on TM-T20III.' : `Not printed${printed.error ? `: ${printed.error}` : '.'}`);
  }

  async function charge() {
    setError('');
    setNotice('');
    if (!canCharge) return;
    setBusy(true);
    try {
      const saleRes = await fetch(`${API}/channels/pos/sales`, {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          externalId: `pwa-${Date.now()}`,
          name: name.trim() || 'Walk-in',
          email: email.trim(),
          fulfillment,
          paymentMethod: payment,
          promoCode: promo.trim() || undefined,
          county: fulfillment === 'DELIVERY' ? county : undefined,
          address:
            fulfillment === 'DELIVERY'
              ? {
                  line1: line1.trim(),
                  city: city.trim(),
                  county,
                  eircode: normalizeEircode(eircode),
                  label: 'HOME',
                }
              : undefined,
          lines: basket.map((line) => ({
            sku: line.sku,
            quantity: line.quantity,
            unitPriceCents: line.priceCents,
          })),
          totalCents,
        }),
      });
      const sale = (await saleRes.json()) as {
        orderId?: string;
        paymentMethod?: string;
        payUrl?: string | null;
        mock?: boolean;
      };
      if (!saleRes.ok || !sale.orderId) {
        setError(apiErrorMessage(sale, 'Sale failed. Check stock and try again.'));
        return;
      }
      sessionStorage.setItem(LAST_ORDER_KEY, sale.orderId);
      setLastOrderId(sale.orderId);
      const mailed = email.trim() ? ' Receipt emailed.' : '';
      if (payment === 'CARD' && sale.payUrl && !sale.mock) {
        setNotice('Opening card payment…');
        window.location.href = sale.payUrl;
        return;
      }
      await printTicket(
        sale.orderId,
        payment === 'CASH' && tenderedCents != null && changeCents != null
          ? { tenderedCents, changeCents }
          : undefined,
      );
      setNotice((current) => `${current}${mailed}`);
      setBasket([]);
      setTendered('');
      setPromo('');
      setSaleOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Sale failed.');
    } finally {
      setBusy(false);
    }
  }

  async function reprint() {
    if (!lastOrderId) return;
    setError('');
    setBusy(true);
    try {
      await printTicket(lastOrderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Reprint failed.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col gap-3">
      <div className="flex shrink-0 items-center justify-between gap-3">
        <p className={`min-w-0 truncate text-sm ${error ? 'text-rose-800' : 'text-ink/60'}`}>
          {error || notice || 'Scan a SKU or tap a product'}
        </p>
        <SecondaryButton type="button" disabled={!lastOrderId || busy} onClick={() => void reprint()}>
          Reprint
        </SecondaryButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col gap-3 lg:flex-row">
        <section className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white">
          <div className="shrink-0 px-3 pt-1">
            <FilterTabs
              items={categories.map((item) => ({ id: item.slug, label: item.name }))}
              current={query ? '' : category}
              onChange={(id) => {
                setCategory(id);
                setQuery('');
                skuRef.current?.focus();
              }}
            />
            <form onSubmit={onSearch} className="py-3">
              <input
                ref={skuRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={fieldClass}
                placeholder="Search or scan SKU"
                autoFocus
              />
            </form>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 pt-0">
            {products.length ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
                {products.map((product) => (
                  <button
                    key={product.id}
                    type="button"
                    onClick={() => setPicking(product)}
                    className="rounded-xl border border-ink/10 p-2 text-left hover:border-accent"
                  >
                    <div className="aspect-[3/4] overflow-hidden rounded-lg bg-ink/5">
                      {product.images[0] ? (
                        <img src={product.images[0].url} alt={product.images[0].alt} className="h-full w-full object-cover" />
                      ) : null}
                    </div>
                    <p className="mt-2 truncate text-sm font-medium">{product.title}</p>
                    <p className="text-xs text-ink/55">{catalogPriceLabel(product.variants)}</p>
                  </button>
                ))}
              </div>
            ) : (
              <p className="p-6 text-center text-sm text-ink/55">No products in this category. Search or pick another.</p>
            )}
          </div>
        </section>

        {saleOpen ? (
          <aside className="flex max-h-[50%] min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-ink/10 bg-white lg:max-h-none lg:w-80">
            <div className="flex shrink-0 items-center justify-between gap-2 border-b border-ink/10 px-4 py-3">
              <div>
                <h2 className="font-serif text-lg">Sale</h2>
                <p className="text-xs text-ink/50">
                  {itemCount ? `${itemCount} ${itemCount === 1 ? 'item' : 'items'} · ${formatEur(totalCents)}` : 'Empty'}
                </p>
              </div>
              <SecondaryButton
                type="button"
                onClick={() => setSaleOpen(false)}
                aria-label="Hide sale"
              >
                Hide
              </SecondaryButton>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {basket.length ? (
                <ul className="divide-y divide-ink/10">
                  {basket.map((line) => (
                    <li key={line.sku} className="flex items-start justify-between gap-2 py-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{line.productTitle}</p>
                        <p className="text-xs text-ink/55">
                          {line.size} / {line.color} · {formatEur(line.priceCents)}
                        </p>
                        <p className="text-sm">{formatEur(line.priceCents * line.quantity)}</p>
                      </div>
                      <QtyStepper
                        value={line.quantity}
                        onDecrease={() => setQty(line.sku, line.quantity - 1)}
                        onIncrease={() => setQty(line.sku, line.quantity + 1)}
                        decreaseLabel={`Remove one ${line.productTitle}`}
                        increaseLabel={`Add one ${line.productTitle}`}
                      />
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-ink/55">Tap a product, then a size.</p>
              )}
              {basket.length ? (
                <div className="mt-3 space-y-3 border-t border-ink/10 pt-3">
                  <Field label="Collect or deliver">
                    <Select
                      value={fulfillment}
                      onChange={(value) => setFulfillment(value as 'COLLECTION' | 'DELIVERY')}
                      options={[
                        { value: 'COLLECTION', label: 'Collect in Dublin' },
                        { value: 'DELIVERY', label: 'Ireland delivery' },
                      ]}
                    />
                  </Field>
                  {fulfillment === 'DELIVERY' ? (
                    <>
                      <Field label="Address">
                        <input value={line1} onChange={(e) => setLine1(e.target.value)} className={fieldClass} />
                      </Field>
                      <Field label="Town">
                        <input value={city} onChange={(e) => setCity(e.target.value)} className={fieldClass} />
                      </Field>
                      <Field label="County">
                        <Select
                          value={county}
                          onChange={setCounty}
                          options={counties.map((row) => ({ value: row.code, label: row.name }))}
                          placeholder="County"
                        />
                      </Field>
                      <Field label="Eircode">
                        <input value={eircode} onChange={(e) => setEircode(e.target.value)} className={fieldClass} />
                      </Field>
                    </>
                  ) : null}
                  <Field label="Coupon">
                    <input value={promo} onChange={(e) => setPromo(e.target.value)} className={fieldClass} placeholder="Code" />
                  </Field>
                  <Field label="Pay">
                    <Select
                      value={payment}
                      onChange={(value) => setPayment(value as 'CASH' | 'CARD')}
                      options={[
                        { value: 'CASH', label: 'Cash' },
                        { value: 'CARD', label: 'Card' },
                      ]}
                    />
                  </Field>
                  <Field label="Customer">
                    <input value={name} onChange={(e) => setName(e.target.value)} className={fieldClass} />
                  </Field>
                  <Field label="Email receipt">
                    <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={fieldClass} placeholder="Optional" />
                  </Field>
                </div>
              ) : null}
            </div>
            {basket.length ? (
              <div className="shrink-0 space-y-3 border-t border-ink/10 p-4">
                <dl className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <dt>Subtotal</dt>
                    <dd>{formatEur(quote?.subtotalCents ?? totalCents)}</dd>
                  </div>
                  {quote && quote.discountCents > 0 ? (
                    <div className="flex justify-between text-ink/60">
                      <dt>Discount</dt>
                      <dd>−{formatEur(quote.discountCents)}</dd>
                    </div>
                  ) : null}
                  {quote && fulfillment === 'DELIVERY' ? (
                    <div className="flex justify-between text-ink/60">
                      <dt>Delivery</dt>
                      <dd>{quote.needsCounty ? 'Choose county' : formatEur(quote.shippingCents)}</dd>
                    </div>
                  ) : null}
                  <div className="flex justify-between font-medium">
                    <dt>Total inc. VAT</dt>
                    <dd>{formatEur(totalCents)}</dd>
                  </div>
                </dl>
                {payment === 'CASH' ? (
                  <>
                    <Field label="Cash tendered">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={tendered}
                        onChange={(e) => setTendered(e.target.value)}
                        className={fieldClass}
                      />
                    </Field>
                    <div className="flex items-center justify-between gap-2">
                      <SecondaryButton type="button" disabled={!totalCents} onClick={() => setTendered((totalCents / 100).toFixed(2))}>
                        Exact
                      </SecondaryButton>
                      <p className="text-sm text-ink/60">Change {changeCents == null || changeCents < 0 ? '—' : formatEur(changeCents)}</p>
                    </div>
                  </>
                ) : null}
                <PrimaryButton type="button" className="w-full" disabled={!canCharge} onClick={() => void charge()}>
                  {busy ? 'Working…' : canCharge ? (payment === 'CARD' ? 'Charge card' : 'Charge and print') : chargeHint}
                </PrimaryButton>
              </div>
            ) : null}
          </aside>
        ) : itemCount ? (
          <aside className="flex w-full shrink-0 flex-col gap-2 self-start rounded-2xl border border-ink/10 bg-white p-3 lg:w-44">
            <p className="text-[10px] uppercase tracking-widest text-ink/45">Sale</p>
            <p className="font-serif text-2xl tabular-nums">{formatEur(totalCents)}</p>
            <p className="text-xs text-ink/55">
              {itemCount} {itemCount === 1 ? 'item' : 'items'}
            </p>
            <SecondaryButton type="button" className="w-full" onClick={() => setSaleOpen(true)}>
              Open
            </SecondaryButton>
          </aside>
        ) : null}
      </div>
      {picking ? (
        <Modal title={picking.title} onClose={() => setPicking(null)}>
          <PosVariantPicker product={picking} onPick={(sku) => addVariant(picking, sku)} />
        </Modal>
      ) : null}
    </div>
  );
}
