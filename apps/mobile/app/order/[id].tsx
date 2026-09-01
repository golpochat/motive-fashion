import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../src/api';

export default function OrderDetail() {
  const { id, token } = useLocalSearchParams<{ id: string; token?: string }>();
  const [order, setOrder] = useState<{ status: string; totalCents: number } | null>(null);
  useEffect(() => {
    if (!id || !token) return;
    api<{ status: string; totalCents: number }>(`/orders/${id}/track?token=${encodeURIComponent(token)}`)
      .then(setOrder)
      .catch(() => null);
  }, [id, token]);
  return (
    <View style={{ padding: 24 }}>
      <Text>Order {id}</Text>
      <Text>{order?.status}</Text>
    </View>
  );
}
