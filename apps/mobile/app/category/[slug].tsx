import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text } from 'react-native';
import { Link } from 'expo-router';
import { api } from '../../src/api';

export default function Category() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [items, setItems] = useState<{ id: string; slug: string; title: string }[]>([]);
  useEffect(() => {
    if (slug) {
      api<{ id: string; slug: string; title: string }[]>(`/catalog/products?category=${slug}`)
        .then(setItems)
        .catch(() => setItems([]));
    }
  }, [slug]);
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={<Text style={{ padding: 16, fontSize: 22 }}>{slug}</Text>}
      renderItem={({ item }) => (
        <Link href={`/product/${item.slug}`} asChild>
          <Pressable style={{ padding: 16 }}>
            <Text>{item.title}</Text>
          </Pressable>
        </Link>
      )}
    />
  );
}
