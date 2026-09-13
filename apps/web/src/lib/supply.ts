export function formatUnits(n: number) {
  return n.toLocaleString('en-IE');
}

export function formatEuro(cents: number) {
  return (cents / 100).toLocaleString('en-IE', { style: 'currency', currency: 'EUR' });
}

export const PACE_LABEL = {
  fast: 'Selling fast',
  steady: 'Steady',
  quiet: 'Quiet',
} as const;

export const PO_STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft',
  ORDERED: 'Ordered',
  IN_TRANSIT: 'In transit',
  PARTIALLY_RECEIVED: 'Part received',
  RECEIVED: 'Received',
  CANCELLED: 'Cancelled',
};
