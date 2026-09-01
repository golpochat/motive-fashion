import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../../src/api';

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [order, setOrder] = useState<{ status: string; totalCents: number } | null>(null);
  useEffect(() => {
    if (id) api(`/orders/${id}/track`).then(setOrder).catch(() => null);
  }, [id]);
  return (
    <View style={{ padding: 24 }}>
      <Text>Order {id}</Text>
      <Text>{order?.status}</Text>
    </View>
  );
}
