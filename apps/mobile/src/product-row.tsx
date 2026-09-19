import { Image, Pressable, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { priceTaxSuffix } from '@motive-fashion/config';
import { formatEur, mediaUrl } from './api';

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  images: { url: string; alt: string }[];
  variants: { priceCents: number; available: number }[];
};

export function ProductRow({ item }: { item: ProductCard }) {
  const soldOut = !item.variants.some((row) => row.available > 0);
  const prices = item.variants.map((row) => row.priceCents);
  const price = prices.length ? Math.min(...prices) : 0;
  const image = item.images[0];
  return (
    <Link href={`/product/${item.slug}`} asChild>
      <Pressable style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#ddd', flexDirection: 'row', gap: 12 }}>
        {image ? (
          <Image source={{ uri: mediaUrl(image.url) }} style={{ width: 72, height: 96, borderRadius: 8 }} />
        ) : (
          <View style={{ width: 72, height: 96, borderRadius: 8, backgroundColor: '#e7e5e4' }} />
        )}
        <View style={{ flex: 1, justifyContent: 'center' }}>
          <Text>{item.title}</Text>
          <Text>{soldOut ? 'Sold out' : `${formatEur(price)}${priceTaxSuffix()}`}</Text>
        </View>
      </Pressable>
    </Link>
  );
}
