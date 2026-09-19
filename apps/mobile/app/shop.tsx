import { useEffect, useState } from 'react';
import { FlatList, Pressable, Text, TextInput, View } from 'react-native';
import { api, catalogItems } from '../src/api';
import { ProductRow, type ProductCard } from '../src/product-row';

type Category = { slug: string; name: string };

export default function Shop() {
  const [items, setItems] = useState<ProductCard[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [q, setQ] = useState('');
  const [category, setCategory] = useState('');
  const [inStock, setInStock] = useState(false);

  useEffect(() => {
    api<Category[]>('/catalog/categories')
      .then(setCategories)
      .catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    const params = new URLSearchParams();
    if (q.trim()) params.set('q', q.trim());
    if (category) params.set('category', category);
    if (inStock) params.set('inStock', '1');
    const query = params.toString();
    api<unknown>(`/catalog/products${query ? `?${query}` : ''}`)
      .then((payload) => setItems(catalogItems<ProductCard>(payload)))
      .catch(() => setItems([]));
  }, [q, category, inStock]);

  return (
    <FlatList
      data={items}
      keyExtractor={(i) => i.id}
      contentContainerStyle={{ padding: 16 }}
      ListHeaderComponent={
        <View style={{ gap: 12, marginBottom: 12 }}>
          <TextInput
            placeholder="Search hijabs, abayas…"
            value={q}
            onChangeText={setQ}
            autoCapitalize="none"
            style={{ borderWidth: 1, padding: 10, borderRadius: 8 }}
          />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            <Pressable
              onPress={() => setCategory('')}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: category === '' ? '#b45309' : '#d6d3d1',
              }}
            >
              <Text>All</Text>
            </Pressable>
            {categories.map((row) => (
              <Pressable
                key={row.slug}
                onPress={() => setCategory(row.slug)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: category === row.slug ? '#b45309' : '#d6d3d1',
                }}
              >
                <Text>{row.name}</Text>
              </Pressable>
            ))}
            <Pressable
              onPress={() => setInStock((value) => !value)}
              style={{
                paddingHorizontal: 10,
                paddingVertical: 8,
                borderRadius: 999,
                borderWidth: 1,
                borderColor: inStock ? '#b45309' : '#d6d3d1',
              }}
            >
              <Text>In stock</Text>
            </Pressable>
          </View>
        </View>
      }
      renderItem={({ item }) => <ProductRow item={item} />}
    />
  );
}
