import { useEffect, useState } from 'react';
import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { availableStock } from '@motive-fashion/utils';
import { api, mediaUrl } from '../src/api';
import { addToBag } from '../src/cart';

type Wish = {
  productId: string;
  product: {
    title: string;
    slug: string;
    images: { url: string; alt: string }[];
    variants: { id: string; inventory: { onHand: number; reserved: number }[] }[];
  };
};

export default function Wishlist() {
  const [rows, setRows] = useState<Wish[]>([]);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    api<Wish[]>('/account/wishlist')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);

  return (
    <View style={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24 }}>Wishlist</Text>
      {rows.map((row) => {
        const image = row.product.images[0];
        const variant = row.product.variants.find((item) =>
          item.inventory.some((level) => availableStock(level.onHand, level.reserved) > 0),
        );
        return (
          <View key={row.productId} style={{ gap: 8 }}>
            <Link href={`/product/${row.product.slug}`}>
              <View style={{ flexDirection: 'row', gap: 12 }}>
                {image ? (
                  <Image source={{ uri: mediaUrl(image.url) }} style={{ width: 64, height: 86, borderRadius: 8 }} />
                ) : null}
                <Text>{row.product.title}</Text>
              </View>
            </Link>
            <Pressable
              disabled={!variant}
              onPress={async () => {
                if (!variant) return;
                try {
                  await addToBag(variant.id, 1);
                  setMsg('Added to bag.');
                } catch {
                  setMsg('Could not add this piece.');
                }
              }}
            >
              <Text>{variant ? 'Add to bag' : 'Sold out'}</Text>
            </Pressable>
          </View>
        );
      })}
      {msg ? <Text>{msg}</Text> : null}
    </View>
  );
}
