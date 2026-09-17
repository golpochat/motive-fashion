import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { Link } from 'expo-router';
import { api, catalogItems } from '../src/api';

export default function Shop() {
  const [items, setItems] = useState<{ id: string; slug: string; title: string }[]>([]);
  useEffect(() => {
    api<unknown>('/catalog/products')
      .then((payload) => setItems(catalogItems<{ id: string; slug: string; title: string }>(payload)))
      .catch(() => setItems([]));
  }, []);
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16 }}
      renderItem={({ item }) => (
        <Link href={`/product/${item.slug}`} asChild>
          <Pressable style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ddd' }}>
            <Text>{item.title}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
