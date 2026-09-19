import Constants from 'expo-constants';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Image, Pressable, ScrollView, Share, Text, View } from 'react-native';
import { catalogSizeLabel, sizeHintForCategory, uniqueColors, uniqueSizes } from '@motive-fashion/utils';
import { BRAND, priceTaxSuffix } from '@motive-fashion/config';
import { api, formatEur, mediaUrl } from '../../src/api';
import { addToBag } from '../../src/cart';
import { getAccessToken } from '../../src/session';

const SITE = (Constants.expoConfig?.extra?.siteUrl as string | undefined) ?? 'https://motivefashion.com';

type Variant = {
  id: string;
  sku: string;
  size: string;
  color: string;
  priceCents: number;
  available: number;
};

type Product = {
  id: string;
  title: string;
  description: string;
  categorySlug?: string;
  images: { url: string; alt: string }[];
  variants: Variant[];
  reviews?: { rating: number; body: string; user: { name: string } }[];
  ratingAvg?: number;
  ratingCount?: number;
};

function Chip({
  label,
  selected,
  disabled,
  onPress,
}: {
  label: string;
  selected: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={{
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderRadius: 999,
        borderWidth: 1,
        borderColor: selected ? '#b45309' : '#d6d3d1',
        backgroundColor: selected ? '#fef3c7' : '#fff',
        opacity: disabled ? 0.4 : 1,
      }}
    >
      <Text>{label}</Text>
    </Pressable>
  );
}

export default function Pdp() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const [product, setProduct] = useState<Product | null>(null);
  const [size, setSize] = useState('');
  const [color, setColor] = useState('');
  const [msg, setMsg] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!slug) return;
    api<Product>(`/catalog/products/${slug}`)
      .then((row) => {
        setProduct(row);
        const first = row.variants.find((v) => v.available > 0) ?? row.variants[0];
        setSize(first?.size ?? '');
        setColor(first?.color ?? '');
      })
      .catch(() => null);
  }, [slug]);

  const sizes = useMemo(() => (product ? uniqueSizes(product.variants) : []), [product]);
  const colors = useMemo(
    () => (product ? uniqueColors(product.variants.filter((row) => row.size === size)) : []),
    [product, size],
  );
  const selected = product?.variants.find((row) => row.size === size && row.color === color);
  const soldOut = !selected || selected.available < 1;
  const image = product?.images[0];

  if (!product) return <Text style={{ padding: 24 }}>Loading…</Text>;
  const url = `${SITE.replace(/\/$/, '')}/product/${slug}`;

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      {image ? (
        <Image source={{ uri: mediaUrl(image.url) }} style={{ width: '100%', height: 360, borderRadius: 16 }} />
      ) : null}
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ fontSize: 28, flex: 1 }}>{product.title}</Text>
        <Pressable
          onPress={async () => {
            if (!getAccessToken()) {
              setMsg('Sign in to save a wishlist.');
              return;
            }
            try {
              await api(`/account/wishlist/${product.id}`, undefined, { method: saved ? 'DELETE' : 'POST' });
              setSaved(!saved);
            } catch {
              setMsg('Could not update wishlist.');
            }
          }}
          style={{ padding: 8 }}
        >
          <Text>{saved ? '♥' : '♡'}</Text>
        </Pressable>
      </View>
      <Text>{product.description}</Text>
      <Text style={{ fontSize: 18 }}>{formatEur(selected?.priceCents ?? 0)}{priceTaxSuffix()}</Text>
      {sizes.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {sizes.map((item) => {
            const available = product.variants.some((row) => row.size === item && row.available > 0);
            const label = catalogSizeLabel(item);
            return (
              <Chip
                key={item}
                label={available ? label : `${label} · sold out`}
                selected={size === item}
                disabled={!available}
                onPress={() => {
                  setSize(item);
                  const next = product.variants.filter((row) => row.size === item);
                  const keep = next.find((row) => row.color === color && row.available > 0);
                  setColor(keep?.color ?? next.find((row) => row.available > 0)?.color ?? next[0]?.color ?? '');
                }}
              />
            );
          })}
        </View>
      ) : null}
      {colors.length ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {colors.map((item) => {
            const row = product.variants.find((variant) => variant.size === size && variant.color === item);
            const available = (row?.available ?? 0) > 0;
            return (
              <Chip
                key={item}
                label={available ? item : `${item} · sold out`}
                selected={color === item}
                disabled={!available}
                onPress={() => setColor(item)}
              />
            );
          })}
        </View>
      ) : null}
      <Text>
        {soldOut ? 'This combination is sold out.' : `${selected?.available ?? 0} in Dublin · SKU ${selected?.sku ?? '—'}`}
      </Text>
      <Text>{sizeHintForCategory(product.categorySlug, BRAND.returnDays)}</Text>
      <Pressable onPress={() => router.push('/size-guide')}>
        <Text style={{ textDecorationLine: 'underline' }}>Full size guide</Text>
      </Pressable>
      <Pressable
        disabled={soldOut}
        onPress={async () => {
          if (!selected || soldOut) return;
          try {
            await addToBag(selected.id, 1);
            setMsg('Reserved in your bag.');
          } catch (err) {
            const text = err instanceof Error ? err.message : '';
            setMsg(text.includes('customer account') ? 'Only a customer account can add to cart.' : 'Could not add that piece. Try another size or colour.');
          }
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999, opacity: soldOut ? 0.5 : 1 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>{soldOut ? 'Sold out' : 'Add to cart'}</Text>
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
      {msg ? <Text>{msg}</Text> : null}
      {(product.reviews ?? []).length ? (
        <View style={{ gap: 8, marginTop: 12 }}>
          <Text style={{ fontSize: 20 }}>Reviews</Text>
          {product.ratingCount ? (
            <Text>
              {product.ratingAvg?.toFixed(1)} / 5 · {product.ratingCount} review{product.ratingCount === 1 ? '' : 's'}
            </Text>
          ) : null}
          {product.reviews?.map((review, index) => (
            <View key={`${review.user.name}-${index}`}>
              <Text>
                {review.user.name} · {review.rating}/5
              </Text>
              <Text>{review.body}</Text>
            </View>
          ))}
        </View>
      ) : (
        <Text>No reviews yet.</Text>
      )}
    </ScrollView>
  );
}
