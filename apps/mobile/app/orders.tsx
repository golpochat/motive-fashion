import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';
import { api, formatEur } from '../src/api';

type OrderRow = {
  id: string;
  status: string;
  trackingToken: string;
  fulfillment?: string;
  totalCents?: number;
};

export default function Orders() {
  const [rows, setRows] = useState<OrderRow[]>([]);
  useEffect(() => {
    api<OrderRow[]>('/account/orders')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Orders</Text>
      <Link href="/find-order">
        <Text>Find an order with email and ticket</Text>
      </Link>
      {rows.map((order) => (
        <Link key={order.id} href={`/order/${order.id}?token=${encodeURIComponent(order.trackingToken)}`}>
          <Text>
            {order.id.slice(0, 8)} · {ORDER_STATUS_LABEL[order.status] ?? order.status}
            {order.fulfillment ? ` · ${order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}` : ''}
            {order.totalCents != null ? ` · ${formatEur(order.totalCents)}` : ''}
          </Text>
        </Link>
      ))}
    </View>
  );
}
