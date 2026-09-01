import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../src/api';

export default function Checkout() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Checkout</Text>
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput placeholder="Email" value={email} onChangeText={setEmail} style={{ borderWidth: 1, padding: 8 }} />
      <Pressable
        onPress={async () => {
          const cart = await api<{ id: string }>('/cart');
          const order = await api<{ id: string }>('/checkout/session', undefined, {
            method: 'POST',
            body: JSON.stringify({
              cartId: cart.id,
              fulfillment: 'COLLECTION',
              email,
              name,
            }),
          });
          const pay = await api<{ url: string }>(`/checkout/${order.id}/pay`, undefined, { method: 'POST' });
          console.log(pay.url);
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Pay</Text>
      </Pressable>
    </View>
  );
}
