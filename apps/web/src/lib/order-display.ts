export function orderRef(id: string) {
  return id.replace(/-/g, '').slice(0, 8).toUpperCase();
}

export function orderWhen(iso: string) {
  return new Date(iso).toLocaleString('en-IE', { dateStyle: 'medium', timeStyle: 'short' });
}

export function orderItemsLabel(items: { title: string; quantity: number }[]) {
  const first = items[0];
  if (!first) return '—';
  const head = `${first.title} × ${first.quantity}`;
  const extra = items.length - 1;
  if (extra <= 0) return head;
  return extra === 1 ? `${head} + 1 more` : `${head} + ${extra} more`;
}
