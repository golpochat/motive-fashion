import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { FlatList, Text } from 'react-native';
import { api, catalogItems } from '../../src/api';
import { ProductRow, type ProductCard } from '../../src/product-row';

export default function Collection() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [items, setItems] = useState<ProductCard[]>([]);
  useEffect(() => {
    if (!slug) return;
    api<unknown>(`/catalog/products?collection=${encodeURIComponent(slug)}`)
      .then((payload) => setItems(catalogItems<ProductCard>(payload)))
      .catch(() => setItems([]));
  }, [slug]);
  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      ListHeaderComponent={<Text style={{ padding: 16, fontSize: 22 }}>{slug}</Text>}
      renderItem={({ item }) => <ProductRow item={item} />}
    />
  );
}
