'use client';

import { formatEur } from '@motive-fashion/utils';
import { useDelivery } from '@/lib/delivery';

export function BagDeliveryNote({
  subtotalCents = 0,
  showFeeLine = false,
}: {
  subtotalCents?: number;
  showFeeLine?: boolean;
}) {
  const { policy, feeCents, remainingCents, waived, exact } = useDelivery(subtotalCents);
  if (!policy.delivery && !policy.collection) return null;

  const freeOver = policy.freeOverCents;
  const meterMax = freeOver && freeOver > 0 ? freeOver : 0;
  const meterValue = meterMax ? Math.min(subtotalCents, meterMax) : 0;
  const feeLabel = waived ? 'Free' : formatEur(feeCents);

  const headline = !policy.delivery
    ? null
    : waived
      ? 'Ireland delivery is free on this bag.'
      : remainingCents > 0 && subtotalCents > 0
        ? `${formatEur(remainingCents)} more for free Ireland delivery.`
        : freeOver
          ? `Free Ireland delivery over ${formatEur(freeOver)}.`
          : exact
            ? `Ireland delivery ${formatEur(feeCents)}.`
            : `Ireland delivery from ${formatEur(feeCents)}.`;

  const detail = [
    policy.delivery && !waived ? 'Typically 2–5 working days.' : null,
    policy.delivery && !waived && !exact ? `From ${formatEur(policy.rateMinCents)} depending on county.` : null,
    policy.collection ? 'Dublin collection is free.' : null,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className="space-y-2">
      {policy.delivery && meterMax ? (
        <progress
          className="h-1.5 w-full overflow-hidden rounded-full bg-ink/10 [&::-moz-progress-bar]:bg-primary [&::-webkit-progress-bar]:bg-ink/10 [&::-webkit-progress-value]:bg-primary"
          max={meterMax}
          value={meterValue}
          aria-label="Progress toward free Ireland delivery"
        />
      ) : null}
      {showFeeLine && policy.delivery ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-ink/70">{exact || waived ? 'Ireland delivery' : 'Ireland delivery from'}</span>
          <span className="font-medium tabular-nums">{feeLabel}</span>
        </div>
      ) : null}
      <div className="space-y-1 text-xs leading-relaxed text-ink/55">
        {headline ? <p>{headline}</p> : null}
        {detail ? <p>{detail}</p> : null}
      </div>
    </div>
  );
}
