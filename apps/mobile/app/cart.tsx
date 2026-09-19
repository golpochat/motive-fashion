import { useCallback, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Link, useFocusEffect } from 'expo-router';
import { formatEur } from '../src/api';
import { loadCart, removeLine, setLineQty, type MobileCart } from '../src/cart';

export default function Cart() {
  const [cart, setCart] = useState<MobileCart | null>(null);

  useFocusEffect(
    useCallback(() => {
      void loadCart()
        .then(setCart)
        .catch(() => setCart(null));
    }, []),
  );

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Cart</Text>
      {(cart?.items ?? []).map((item) => (
        <View key={item.id} style={{ gap: 6, borderBottomWidth: 1, borderColor: '#e7e5e4', paddingBottom: 12 }}>
          <Text>
            {item.title} · {item.size}/{item.color}
          </Text>
          <Text>{formatEur(item.unitPriceCents * item.quantity)}</Text>
          {item.reserved === false ? <Text>Hold expired — tap + to reserve again.</Text> : null}
          {item.available != null && item.available < 1 ? <Text>Sold out — remove this line.</Text> : null}
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Pressable onPress={() => void setLineQty(item.id, item.quantity - 1).then(setCart)}>
              <Text>−</Text>
            </Pressable>
            <Text>{item.quantity}</Text>
            <Pressable onPress={() => void setLineQty(item.id, item.quantity + 1).then(setCart)}>
              <Text>+</Text>
            </Pressable>
            <Pressable onPress={() => void removeLine(item.id).then(setCart)}>
              <Text>Remove</Text>
            </Pressable>
          </View>
        </View>
      ))}
      {cart?.items.length ? <Text>Subtotal {formatEur(cart.subtotalCents)}</Text> : <Text>Your bag is empty.</Text>}
      <Link href="/checkout">
        <Text style={{ marginTop: 8 }}>Checkout</Text>
      </Link>
    </View>
  );
}
