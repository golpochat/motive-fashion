import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { shopPriceBlurb } from '@motive-fashion/config';
import { api, catalogItems } from '../src/api';
import { ProductRow, type ProductCard } from '../src/product-row';

type Collection = { slug: string; name: string; description?: string | null; inNav?: boolean };

export default function Home() {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [featured, setFeatured] = useState<ProductCard[]>([]);
  const seasonal = collections.filter((row) => row.inNav);

  useEffect(() => {
    api<Collection[]>('/catalog/collections')
      .then(setCollections)
      .catch(() => setCollections([]));
    api<unknown>('/catalog/products?inStock=1&limit=8')
      .then((payload) => setFeatured(catalogItems<ProductCard>(payload)))
      .catch(() => setFeatured([]));
  }, []);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 32, fontFamily: 'Georgia' }}>Quiet luxury, Dublin.</Text>
      <Text>{shopPriceBlurb()}</Text>
      <Link href="/shop" asChild>
        <Pressable style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}>
          <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Shop</Text>
        </Pressable>
      </Link>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        <Link href="/collections">
          <Text>Collections</Text>
        </Link>
        <Link href="/find-order">
          <Text>Find order</Text>
        </Link>
        <Link href="/size-guide">
          <Text>Size guide</Text>
        </Link>
        <Link href="/cart">
          <Text>Cart</Text>
        </Link>
        <Link href="/wishlist">
          <Text>Wishlist</Text>
        </Link>
        <Link href="/orders">
          <Text>Orders</Text>
        </Link>
        <Link href="/profile">
          <Text>Profile</Text>
        </Link>
        <Link href="/legal">
          <Text>Legal</Text>
        </Link>
      </View>
      {seasonal.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 20 }}>This season</Text>
          {seasonal.map((item) => (
            <Link key={item.slug} href={`/collection/${item.slug}`}>
              <Text>{item.name} collection</Text>
            </Link>
          ))}
        </View>
      ) : null}
      {collections.length ? (
        <View style={{ gap: 8 }}>
          <Text style={{ fontSize: 20 }}>Collections</Text>
          {collections.slice(0, 6).map((row) => (
            <Link key={row.slug} href={`/collection/${row.slug}`}>
              <Text>{row.name}</Text>
            </Link>
          ))}
        </View>
      ) : null}
      <Text style={{ fontSize: 20 }}>In stock now</Text>
      {featured.map((item) => (
        <ProductRow key={item.id} item={item} />
      ))}
    </ScrollView>
  );
}
