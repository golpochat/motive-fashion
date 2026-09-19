'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { formatEur } from '@motive-fashion/utils';
import { BRAND, countyLabel, ORDER_STATUS_LABEL, RETURN_POSTAGE_NOTICE, formatIrelandAddress, fulfilmentSteps, carrierLabel, carrierTrackUrl, pricesIncludeVatCopy, totalIncLabel } from '@motive-fashion/config';
import { API } from '@/lib/api';
import { releasePaidCart } from '@/lib/cart-store';
import { useSession } from '@/components/session-provider';
import { hasPerm } from '@/lib/rbac';

export type TrackedOrder = {
  id: string;
  cartId?: string | null;
  status: string;
  channel?: string;
  email: string;
  name: string;
  giftNote?: string | null;
  fulfillment: string;
  shippingCounty?: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  totalCents: number;
  items: { id: string; title: string; size: string; color: string; quantity: number; unitPriceCents: number }[];
  address?: {
    line1: string;
    line2?: string | null;
    city: string;
    county?: string | null;
    eircode?: string | null;
  } | null;
  promo?: { code: string } | null;
  payments?: { createdAt: string }[];
  returns?: { id: string; status: string }[];
  shipments?: {
    carrier?: string | null;
    trackingNo?: string | null;
    packedAt?: string | null;
    shippedAt?: string | null;
    deliveredAt?: string | null;
  }[];
};

function isPaid(status: string) {
  return status !== 'PENDING_PAYMENT' && status !== 'CANCELLED';
}

function isOpenFulfillment(status: string) {
  return status === 'CONFIRMED' || status === 'PACKING' || status === 'SHIPPED' || status === 'READY_FOR_COLLECTION';
}

function formatWhen(iso?: string | null) {
  if (!iso) return null;
  return new Date(iso).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });
}

function stepTime(order: TrackedOrder, step: string) {
  const ship = order.shipments?.[0];
  if (step === 'CONFIRMED') return order.payments?.[0]?.createdAt ?? null;
  if (step === 'PACKING') return ship?.packedAt ?? null;
  if (step === 'SHIPPED' || step === 'READY_FOR_COLLECTION') return ship?.shippedAt ?? null;
  if (step === 'DELIVERED' || step === 'COLLECTED') return ship?.deliveredAt ?? null;
  return null;
}

export function OrderReceipt({
  initial,
  token,
  tone = 'receipt',
}: {
  initial: TrackedOrder;
  token: string;
  tone?: 'receipt' | 'account';
}) {
  const [order, setOrder] = useState(initial);
  const [busy, setBusy] = useState(initial.status === 'PENDING_PAYMENT');
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');
  const [printNote, setPrintNote] = useState('');
  const { me } = useSession();
  const canPrintTill = hasPerm(me, 'pos.sale');

  useEffect(() => {
    let cancelled = false;
    const params = `token=${encodeURIComponent(token)}`;

    async function pull(): Promise<TrackedOrder> {
      const synced = await fetch(`${API}/checkout/${initial.id}/sync?${params}`, {
        method: 'POST',
        credentials: 'include',
      });
      if (synced.ok) return (await synced.json()) as TrackedOrder;
      const tracked = await fetch(`${API}/orders/${initial.id}/track?${params}`, { credentials: 'include' });
      if (!tracked.ok) throw new Error('Could not refresh this order');
      return (await tracked.json()) as TrackedOrder;
    }

    async function run() {
      try {
        let next = await pull();
        if (cancelled) return;
        setOrder(next);
        if (next.status === 'PENDING_PAYMENT') {
          for (let i = 0; i < 5; i += 1) {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            if (cancelled) return;
            next = await pull();
            if (cancelled) return;
            setOrder(next);
            if (next.status !== 'PENDING_PAYMENT') break;
          }
        }
        if (isPaid(next.status)) await releasePaidCart(next.cartId);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not refresh this order');
      } finally {
        if (!cancelled) setBusy(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [initial.id, token]);

  useEffect(() => {
    if (!isOpenFulfillment(order.status)) return;
    let cancelled = false;
    const params = `token=${encodeURIComponent(token)}`;

    async function refresh() {
      const tracked = await fetch(`${API}/orders/${initial.id}/track?${params}`, { credentials: 'include' });
      if (!tracked.ok || cancelled) return;
      setOrder((await tracked.json()) as TrackedOrder);
    }

    const timer = window.setInterval(() => void refresh(), 18_000);
    function onFocus() {
      if (document.visibilityState === 'visible') void refresh();
    }
    document.addEventListener('visibilitychange', onFocus);
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onFocus);
      window.removeEventListener('focus', onFocus);
    };
  }, [initial.id, token, order.status]);

  async function printTillTicket() {
    const res = await fetch(`${API}/admin/pos/print/${order.id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const printed = (await res.json()) as { printed?: boolean; error?: string; message?: string };
    if (!res.ok) throw new Error(printed.message ?? printed.error ?? 'Print failed.');
    setPrintNote(printed.printed ? 'Printed on TM-T20III.' : `Not printed${printed.error ? `: ${printed.error}` : '.'}`);
  }

  useEffect(() => {
    if (!canPrintTill || order.channel !== 'POS' || !isPaid(order.status)) return;
    const key = `mf_pos_autoprint_${order.id}`;
    if (sessionStorage.getItem(key)) return;
    let cancelled = false;
    void fetch(`${API}/admin/pos/print/${order.id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(async (res) => {
        const printed = (await res.json()) as { printed?: boolean; error?: string; message?: string };
        if (cancelled) return;
        if (!res.ok) throw new Error(printed.message ?? printed.error ?? 'Print failed.');
        sessionStorage.setItem(key, '1');
        setPrintNote(printed.printed ? 'Printed on TM-T20III.' : `Not printed${printed.error ? `: ${printed.error}` : '.'}`);
      })
      .catch((err: unknown) => {
        if (!cancelled) setPrintNote(err instanceof Error ? err.message : 'Print failed.');
      });
    return () => {
      cancelled = true;
    };
  }, [canPrintTill, order.channel, order.id, order.status]);

  async function resumePay() {
    setError('');
    const res = await fetch(`${API}/checkout/${order.id}/pay?token=${encodeURIComponent(token)}`, {
      method: 'POST',
      credentials: 'include',
    });
    const payload = (await res.json()) as { url?: string; message?: string };
    if (payload.url) {
      window.location.href = payload.url;
      return;
    }
    setError(payload.message ?? 'Payment could not start');
  }

  async function copyRef() {
    try {
      await navigator.clipboard.writeText(order.id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  const paid = isPaid(order.status);
  const collecting = order.fulfillment === 'COLLECTION';
  const county = countyLabel(order.shippingCounty);
  const status = ORDER_STATUS_LABEL[order.status] ?? order.status.replaceAll('_', ' ');
  const placed = formatWhen(order.payments?.[0]?.createdAt);
  const account = tone === 'account';

  return (
    <div className={account ? 'max-w-3xl' : 'mx-auto max-w-lg'}>
      <p className="text-xs uppercase tracking-widest text-ink/45">{account ? 'Order' : paid ? 'Order confirmed' : 'Payment'}</p>
      <h1 className="mt-1 font-serif text-4xl">
        {account ? status : paid ? 'Thank you' : busy ? 'Confirming payment' : 'Awaiting payment'}
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        {account
          ? placed
            ? `Placed ${placed} for ${order.email}.`
            : `This purchase is on your account (${order.email}).`
          : paid
            ? `We've confirmed your order for ${order.email}. This page is your receipt and tracker.`
            : busy
              ? 'If the card payment succeeded, this page will update in a few seconds.'
              : 'Your cart is still reserved. Complete payment to place the order.'}
      </p>

      <span
        className={`mt-3 inline-block rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
          paid ? 'bg-ink/5 text-ink' : 'border border-ink/20 text-ink/70'
        }`}
      >
        {status}
      </span>

      {paid ? <OrderTimeline order={order} /> : null}

      <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-widest text-ink/45">Order</p>
            <p className="mt-1 break-all font-mono text-sm">{order.id}</p>
          </div>
          <button type="button" className="text-sm underline" onClick={() => void copyRef()}>
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>

        <ul className="mt-4 divide-y divide-ink/10 text-sm">
          {order.items.map((item, idx) => (
            <li key={`${item.title}-${idx}`} className="flex justify-between gap-3 py-2">
              <span>
                {item.title} × {item.quantity}
                <span className="block text-ink/50">
                  {item.size} / {item.color}
                  <span className="text-ink/40"> · {formatEur(item.unitPriceCents)} each</span>
                </span>
              </span>
              <span className="shrink-0 tabular-nums">{formatEur(item.unitPriceCents * item.quantity)}</span>
            </li>
          ))}
        </ul>

        <dl className="mt-2 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatEur(order.subtotalCents)}</dd>
          </div>
          {order.discountCents > 0 ? (
            <div className="flex justify-between">
              <dt>{order.promo?.code ? `Discount (${order.promo.code})` : 'Discount'}</dt>
              <dd>−{formatEur(order.discountCents)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>{collecting ? 'Collection' : 'Delivery'}</dt>
            <dd>{order.shippingCents === 0 ? 'Free' : formatEur(order.shippingCents)}</dd>
          </div>
          <div className="flex justify-between pt-2 text-base">
            <dt>{totalIncLabel()}</dt>
            <dd>{formatEur(order.totalCents)}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-ink/45">{pricesIncludeVatCopy()}</p>
      </section>

      <section className="mt-3 rounded-2xl border border-ink/10 bg-white p-5 text-sm">
        <p className="text-xs uppercase tracking-widest text-ink/45">Fulfilment</p>
        <p className="mt-2">
          {collecting ? 'Collect in Dublin' : `Ireland delivery${county ? ` · ${county}` : ''}`}
        </p>
        {order.address ? <p className="mt-2 text-ink/70">{formatIrelandAddress(order.address)}</p> : null}
        <CourierLine order={order} />
        {order.giftNote ? (
          <p className="mt-3 text-ink/70">
            Gift note: {order.giftNote}
          </p>
        ) : null}
      </section>

      <p className="mt-5 text-sm leading-relaxed text-ink/70">{RETURN_POSTAGE_NOTICE}</p>
      <p className="mt-2 text-sm">
        <Link href="/legal/returns">Returns policy</Link>
      </p>
      <ReturnForm order={order} token={token} onDone={setOrder} />

      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}

      {printNote ? <p className="mt-3 text-sm text-ink/70">{printNote}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {order.status === 'PENDING_PAYMENT' && !busy ? (
          <button
            type="button"
            className="rounded-full bg-primary px-6 py-3 text-cream"
            onClick={() => void resumePay()}
          >
            Complete payment
          </button>
        ) : null}
        {paid && canPrintTill ? (
          <Link href="/staff/pos" className="rounded-full bg-primary px-6 py-3 text-sm text-cream no-underline">
            Back to till
          </Link>
        ) : null}
        {paid && canPrintTill ? (
          <button
            type="button"
            className="rounded-full border border-ink/15 px-6 py-3 text-sm"
            onClick={() => void printTillTicket().catch((err: unknown) => setPrintNote(err instanceof Error ? err.message : 'Print failed.'))}
          >
            Print ticket
          </button>
        ) : null}
        <Link href={account ? '/user/orders' : '/shop'} className="rounded-full border border-ink/15 px-6 py-3 text-sm no-underline">
          {account ? 'Back to orders' : 'Continue shopping'}
        </Link>
      </div>
    </div>
  );
}

function OrderTimeline({ order }: { order: TrackedOrder }) {
  const steps = fulfilmentSteps(order.fulfillment);
  const current = (steps as readonly string[]).indexOf(order.status);
  return (
    <ol className="mt-6 space-y-3 rounded-2xl border border-ink/10 bg-white p-5">
      <li className="text-xs uppercase tracking-widest text-ink/45">Tracking</li>
      {steps.map((step, index) => {
        const reached = current >= index;
        const active = current === index;
        const when = formatWhen(stepTime(order, step));
        return (
          <li key={step} className="flex gap-3 text-sm">
            <span
              className={`mt-0.5 h-2.5 w-2.5 shrink-0 rounded-full ${
                reached ? 'bg-ink' : 'border border-ink/25 bg-transparent'
              }`}
            />
            <span>
              <span className={active ? 'text-ink' : 'text-ink/55'}>{ORDER_STATUS_LABEL[step] ?? step}</span>
              {when ? <span className="mt-0.5 block text-xs text-ink/45">{when}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function CourierLine({ order }: { order: TrackedOrder }) {
  const ship = order.shipments?.[0];
  if (!ship?.trackingNo) return null;
  const href = carrierTrackUrl(ship.carrier, ship.trackingNo);
  const label = `${carrierLabel(ship.carrier) || 'Courier'} ${ship.trackingNo}`;
  if (href) {
    return (
      <p className="mt-2 text-sm">
        <a href={href} rel="noreferrer" target="_blank">
          {label}
        </a>
      </p>
    );
  }
  return <p className="mt-2 text-ink/70">{label}</p>;
}

function ReturnForm({
  order,
  token,
  onDone,
}: {
  order: TrackedOrder;
  token: string;
  onDone: (order: TrackedOrder) => void;
}) {
  const eligible = order.status === 'DELIVERED' || order.status === 'COLLECTED';
  const open = order.returns?.some((row) => row.status === 'REQUESTED' || row.status === 'APPROVED' || row.status === 'RECEIVED');
  const done = order.returns?.some((row) => row.status === 'REFUNDED' || row.status === 'REJECTED');
  const [reason, setReason] = useState('');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  if (!eligible) return null;
  if (open) {
    return <p className="mt-4 text-sm text-ink/70">A return is already open on this order. We will email you when it is reviewed.</p>;
  }
  if (done) {
    return <p className="mt-4 text-sm text-ink/70">This order already has a closed return.</p>;
  }

  async function submit() {
    setError('');
    const items = order.items
      .filter((item) => selected[item.id])
      .map((item) => ({ orderItemId: item.id, quantity: item.quantity }));
    if (!items.length) {
      setError('Select at least one piece to return.');
      return;
    }
    if (reason.trim().length < 5) {
      setError('Tell us why you are returning this order.');
      return;
    }
    setBusy(true);
    const res = await fetch(`${API}/returns`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ orderId: order.id, reason: reason.trim(), trackingToken: token, items }),
    });
    const payload = await res.json().catch(() => null);
    setBusy(false);
    if (!res.ok) {
      setError(payload && typeof payload === 'object' && 'message' in payload ? String(payload.message) : 'Could not start this return.');
      return;
    }
    onDone({ ...order, returns: [...(order.returns ?? []), { id: String(payload?.id ?? 'new'), status: 'REQUESTED' }] });
  }

  return (
    <section className="mt-6 rounded-2xl border border-ink/10 bg-white p-5">
      <h2 className="font-serif text-2xl">Start a return</h2>
      <p className="mt-2 text-sm text-ink/70">{RETURN_POSTAGE_NOTICE}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {order.items.map((item) => (
          <li key={item.id}>
            <label className="flex gap-2">
              <input
                type="checkbox"
                checked={Boolean(selected[item.id])}
                onChange={(e) => setSelected((prev) => ({ ...prev, [item.id]: e.target.checked }))}
              />
              <span>
                {item.title} × {item.quantity}
                <span className="block text-ink/50">
                  {item.size} / {item.color}
                </span>
              </span>
            </label>
          </li>
        ))}
      </ul>
      <label className="mt-4 block text-sm">
        <span className="mb-1.5 block text-xs uppercase tracking-wider text-ink/55">Reason</span>
        <textarea className="w-full rounded-xl border border-ink/15 px-3 py-2" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} />
      </label>
      {error ? (
        <p className="mt-3 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        className="mt-4 rounded-full bg-primary px-6 py-3 text-sm text-cream"
        disabled={busy}
        onClick={() => void submit()}
      >
        {busy ? 'Sending…' : 'Request return'}
      </button>
    </section>
  );
}
