import { api } from '@/lib/api';
import { formatEur } from '@motive-fashion/utils';

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
    return <p>This order link is missing its tracking token.</p>;
  }
  const order = await api<{
    id: string;
    status: string;
    totalCents: number;
    fulfillment: string;
    items: { title: string; quantity: number }[];
  }>(`/orders/${id}/track?token=${encodeURIComponent(token)}`);
  return (
    <div>
      <h1 className="font-serif text-4xl">Order {order.id.slice(0, 8)}</h1>
      <p className="mt-4">Status: {order.status.replaceAll('_', ' ')}</p>
      <p>Fulfillment: {order.fulfillment}</p>
      <ul className="mt-6">
        {order.items.map((i, idx) => (
          <li key={idx}>
            {i.title} × {i.quantity}
          </li>
        ))}
      </ul>
      <p className="mt-4">{formatEur(order.totalCents)} inc. VAT</p>
    </div>
  );
}
