import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { Link } from 'expo-router';
import { api } from '../src/api';
import { getCartId, getSessionKey, setCartId } from '../src/session';

export default function Cart() {
  const [cart, setCart] = useState<{ items: { title: string; quantity: number }[]; subtotalCents: number } | null>(
    null,
  );
  useEffect(() => {
    const id = getCartId();
    const sessionKey = getSessionKey();
    const qs = new URLSearchParams({ sessionKey });
    if (id) qs.set('cartId', id);
    api<{ id: string; items: { title: string; quantity: number }[]; subtotalCents: number }>(
      `/cart?${qs.toString()}`,
    )
      .then((next) => {
        setCartId(next.id);
        setCart(next);
      })
      .catch(() => null);
  }, []);
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Cart</Text>
      {cart?.items?.map((i, idx) => (
        <Text key={idx}>
          {i.title} × {i.quantity}
        </Text>
      ))}
      <Link href="/checkout">
        <Text style={{ marginTop: 16 }}>Checkout</Text>
      </Link>
    </View>
  );
}
