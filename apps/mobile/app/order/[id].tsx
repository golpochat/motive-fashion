import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';
import { api, formatEur } from '../../src/api';

type Tracked = {
  status: string;
  fulfillment?: string;
  totalCents: number;
  ticket?: string | null;
  items?: { title: string; quantity: number; size?: string; color?: string }[];
};

export default function OrderDetail() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [order, setOrder] = useState<Tracked | null>(null);
  useEffect(() => {
    if (!id || !token) return;
    api<Tracked>(`/orders/${id}/track?token=${encodeURIComponent(token)}`)
      .then(setOrder)
      .catch(() => null);
  }, [id, token]);
  return (
    <View style={{ padding: 24, gap: 8 }}>
      <Text style={{ fontSize: 24 }}>Order {order?.ticket ?? id}</Text>
      <Text>{ORDER_STATUS_LABEL[order?.status ?? ''] ?? order?.status}</Text>
      <Text>{order?.fulfillment === 'COLLECTION' ? 'Dublin collection' : order?.fulfillment === 'DELIVERY' ? 'Ireland delivery' : ''}</Text>
      {order?.totalCents != null ? <Text>{formatEur(order.totalCents)}</Text> : null}
      {(order?.items ?? []).map((item, index) => (
        <Text key={`${item.title}-${index}`}>
          {item.title} {item.size ? `· ${item.size}/${item.color}` : ''} × {item.quantity}
        </Text>
      ))}
    </View>
  );
}
