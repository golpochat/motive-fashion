import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { api } from '../src/api';
import { getCartId, getSessionKey, setCartId } from '../src/session';

export default function Checkout() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Checkout</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <Pressable
        onPress={async () => {
          try {
            const cartId = getCartId();
            const sessionKey = getSessionKey();
            const qs = new URLSearchParams({ sessionKey });
            if (cartId) qs.set('cartId', cartId);
            const cart = await api<{ id: string }>(`/cart?${qs.toString()}`, undefined, {
              method: cartId ? 'GET' : 'POST',
            });
            setCartId(cart.id);
            const order = await api<{ id: string; trackingToken: string }>('/checkout/session', undefined, {
              method: 'POST',
              body: JSON.stringify({
                cartId: cart.id,
                sessionKey,
                fulfillment: 'COLLECTION',
                email,
                name,
              }),
            });
            const pay = await api<{ url: string }>(
              `/checkout/${order.id}/pay?token=${encodeURIComponent(order.trackingToken)}`,
              undefined,
              { method: 'POST' },
            );
            if (pay.url) await Linking.openURL(pay.url);
            else setMsg('Payment link unavailable');
          } catch (err) {
            setMsg(err instanceof Error ? err.message : 'Checkout failed');
          }
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Pay</Text>
      </Pressable>
      {msg ? <Text>{msg}</Text> : null}
    </View>
  );
}
