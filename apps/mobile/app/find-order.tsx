import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { api } from '../src/api';

export default function FindOrder() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [ticket, setTicket] = useState('');
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Find my order</Text>
      <Text>Use the email on the order and the ticket from your confirmation.</Text>
      <TextInput
        placeholder="Order email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 8 }}
      />
      <TextInput
        placeholder="Order number"
        value={ticket}
        onChangeText={setTicket}
        autoCapitalize="characters"
        style={{ borderWidth: 1, padding: 8 }}
      />
      <Pressable
        disabled={busy}
        onPress={async () => {
          setMsg('');
          setBusy(true);
          try {
            const payload = await api<{ id: string; trackingToken: string }>('/orders/lookup', undefined, {
              method: 'POST',
              body: JSON.stringify({ email, ticket }),
            });
            router.push(`/order/${payload.id}?token=${encodeURIComponent(payload.trackingToken)}`);
          } catch {
            setMsg('No order matched that email and ticket.');
          } finally {
            setBusy(false);
          }
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999, opacity: busy ? 0.5 : 1 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>{busy ? 'Looking…' : 'Find order'}</Text>
      </Pressable>
      {msg ? <Text>{msg}</Text> : null}
    </View>
  );
}
