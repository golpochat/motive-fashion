import { useSyncExternalStore } from 'react';
import { DEFAULT_COUNTY_RATE_CENTS, DEFAULT_FREE_SHIP_OVER_CENTS } from '@motive-fashion/config';
import { quoteShippingCents } from '@motive-fashion/utils';
import { API } from '@/lib/api';

export type DeliveryPolicy = {
  delivery: boolean;
  collection: boolean;
  rateMinCents: number;
  rateMaxCents: number;
  freeOverCents: number | null;
};

export type BagDeliveryQuote = {
  feeCents: number;
  remainingCents: number;
  waived: boolean;
  progress: number;
  exact: boolean;
};

type Options = {
  fulfilment?: { code: string; freeOverCents: number | null }[];
  counties?: { rateCents: number }[];
};

const defaults: DeliveryPolicy = {
  delivery: true,
  collection: true,
  rateMinCents: DEFAULT_COUNTY_RATE_CENTS,
  rateMaxCents: DEFAULT_COUNTY_RATE_CENTS,
  freeOverCents: DEFAULT_FREE_SHIP_OVER_CENTS,
};

let policy: DeliveryPolicy = defaults;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function quoteBagDelivery(goodsCents: number, next: DeliveryPolicy): BagDeliveryQuote {
  const goods = Math.max(0, goodsCents);
  const feeCents = next.delivery
    ? quoteShippingCents({
        fulfillment: 'DELIVERY',
        goodsCents: goods,
        collectionFeeCents: 0,
        countyRateCents: next.rateMinCents,
        freeOverCents: next.freeOverCents,
      })
    : 0;
  const remainingCents =
    next.delivery && next.freeOverCents != null ? Math.max(0, next.freeOverCents - goods) : 0;
  const waived = Boolean(next.delivery && next.freeOverCents != null && goods >= next.freeOverCents);
  const progress =
    next.delivery && next.freeOverCents && next.freeOverCents > 0
      ? Math.min(1, goods / next.freeOverCents)
      : 0;
  return {
    feeCents,
    remainingCents,
    waived,
    progress,
    exact: next.rateMinCents === next.rateMaxCents,
  };
}

export async function refreshDelivery() {
  try {
    const res = await fetch(`${API}/checkout/options`, { credentials: 'include' });
    if (!res.ok) return policy;
    const data = (await res.json()) as Options;
    const methods = data.fulfilment ?? [];
    const del = methods.find((row) => row.code === 'DELIVERY');
    const col = methods.find((row) => row.code === 'COLLECTION');
    const rates = (data.counties ?? []).map((row) => row.rateCents).filter((n) => Number.isFinite(n));
    policy = {
      delivery: Boolean(del),
      collection: Boolean(col),
      rateMinCents: rates.length ? Math.min(...rates) : DEFAULT_COUNTY_RATE_CENTS,
      rateMaxCents: rates.length ? Math.max(...rates) : DEFAULT_COUNTY_RATE_CENTS,
      freeOverCents: del?.freeOverCents ?? null,
    };
    emit();
    return policy;
  } catch {
    return policy;
  }
}

export function useDelivery(goodsCents: number) {
  const current = useSyncExternalStore(subscribe, () => policy, () => defaults);
  return { policy: current, ...quoteBagDelivery(goodsCents, current) };
}
