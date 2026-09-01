import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { api } from '../../src/api';
import { getCartId, getSessionKey, setCartId } from '../../src/session';

export default function Pdp() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<{ title: string; description: string; variants: { id: string }[] } | null>(
    null,
  );
  useEffect(() => {
    if (slug) {
      api<{ title: string; description: string; variants: { id: string }[] }>(`/catalog/products/${slug}`)
        .then(setProduct)
        .catch(() => null);
    }
  }, [slug]);
  if (!product) return <Text style={{ padding: 24 }}>Loading…</Text>;
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 28 }}>{product.title}</Text>
      <Text>{product.description}</Text>
      <Pressable
        onPress={async () => {
          const sessionKey = getSessionKey();
          const existing = getCartId();
          const cart = existing
            ? { id: existing }
            : await api<{ id: string }>(`/cart?sessionKey=${encodeURIComponent(sessionKey)}`, undefined, {
                method: 'POST',
              });
          setCartId(cart.id);
          await api(`/cart/${cart.id}/items?sessionKey=${encodeURIComponent(sessionKey)}`, undefined, {
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
