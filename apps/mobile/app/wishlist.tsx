import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { api } from '../src/api';

export default function Wishlist() {
  const [rows, setRows] = useState<{ product: { title: string } }[]>([]);
  useEffect(() => {
    api<{ product: { title: string } }[]>('/account/wishlist')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Wishlist</Text>
      {rows.map((r, i) => (
        <Text key={i}>{r.product.title}</Text>
      ))}
    </View>
  );
}
