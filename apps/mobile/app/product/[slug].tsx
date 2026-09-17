import Constants from 'expo-constants';
import { useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, Share, Text, View } from 'react-native';
import { api } from '../../src/api';
import { getCartId, getSessionKey, setCartId } from '../../src/session';

const SITE =
  (Constants.expoConfig?.extra?.siteUrl as string | undefined) ?? 'https://motivefashion.com';

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
  const url = `${SITE.replace(/\/$/, '')}/product/${slug}`;
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
      <Pressable
        onPress={() =>
          Share.share({
            title: product.title,
            message: `${product.title} from Motive Fashion\n${url}`,
            url,
          })
        }
        style={{ borderColor: '#1c1917', borderWidth: 1, padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#1c1917', textAlign: 'center' }}>Share</Text>
      </Pressable>
    </View>
  );
}
