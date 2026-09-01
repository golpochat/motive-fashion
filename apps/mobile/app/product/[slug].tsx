import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api';

export default function Pdp() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<{ title: string; description: string; variants: { id: string }[] } | null>(
    null,
  );
  useEffect(() => {
    if (slug) api(`/catalog/products/${slug}`).then(setProduct).catch(() => null);
  }, [slug]);
  if (!product) return <Text style={{ padding: 24 }}>Loading…</Text>;
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28 }}>{product.title}</Text>
      <Text>{product.description}</Text>
      <Pressable
        onPress={async () => {
          const cart = await api<{ id: string }>('/cart', undefined, { method: 'POST' });
          await api(`/cart/${cart.id}/items`, undefined, {
            method: 'POST',
            body: JSON.stringify({ variantId: product.variants[0]?.id, quantity: 1 }),
          });
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Add to cart</Text>
      </Pressable>
    </View>
  );
}
