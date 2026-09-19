import { api } from '@/lib/api';
import { pageMeta } from '@/lib/page-meta';
import { OrderFindForm } from '@/components/order-find';
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
        <h1 className="font-serif text-4xl">Find my order</h1>
        <p className="mt-4 text-sm text-ink/70">
          Enter the email and order number from your confirmation. We will open the same tracking page as the email
          link.
        </p>
        <OrderFindForm defaultTicket={id} />
      </div>
    );
  }
  const order = await api<TrackedOrder>(`/orders/${id}/track?token=${encodeURIComponent(token)}`);
  return <OrderReceipt initial={order} token={token} />;
}
