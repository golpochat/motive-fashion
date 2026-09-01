import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { api } from '../src/api';

export default function Orders() {
  const [rows, setRows] = useState<{ id: string; status: string; trackingToken: string }[]>([]);
  useEffect(() => {
    api<{ id: string; status: string; trackingToken: string }[]>('/account/orders')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Orders</Text>
      {rows.map((o) => (
        <Link key={o.id} href={`/order/${o.id}?token=${encodeURIComponent(o.trackingToken)}`}>
          <Text>
            {o.id.slice(0, 8)} {o.status}
          </Text>
        </Link>
      ))}
    </View>
  );
}
