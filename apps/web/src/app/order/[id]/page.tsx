import { api } from '@/lib/api';
import { pageMeta } from '@/lib/page-meta';
import { OrderReceipt, type TrackedOrder } from './order-receipt';

export const metadata = pageMeta('Order', 'Track a Motive Fashion order with the link from your confirmation email.');

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;
  if (!token) {
    return (
      <div className="mx-auto max-w-lg">
        <h1 className="font-serif text-4xl">Order link</h1>
        <p className="mt-4 text-sm text-ink/70">This order link is missing its tracking token.</p>
      </div>
    );
  }
  const order = await api<TrackedOrder>(`/orders/${id}/track?token=${encodeURIComponent(token)}`);
  return <OrderReceipt initial={order} token={token} />;
}
