import { useEffect, useState } from 'react';
import { Pressable, Switch, Text, TextInput, View } from 'react-native';
import { Link } from 'expo-router';
import { api } from '../src/api';

type Me = {
  name: string;
  email: string;
  phone?: string | null;
  marketingOptIn?: boolean;
  whatsappOptIn?: boolean;
};

export default function Profile() {
  const [me, setMe] = useState<Me | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [emailOpt, setEmailOpt] = useState(false);
  const [waOpt, setWaOpt] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api<Me>('/account/me')
      .then((row) => {
        setMe(row);
        setName(row.name);
        setPhone(row.phone ?? '');
        setEmailOpt(Boolean(row.marketingOptIn));
        setWaOpt(Boolean(row.whatsappOptIn));
      })
      .catch(() => setMe(null));
  }, []);

  if (!me) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ fontSize: 24 }}>Profile</Text>
        <Text>Sign in to edit your name, phone, and message opt-ins.</Text>
        <Link href="/legal">
          <Text>Business details and returns</Text>
        </Link>
        <Link href="/find-order">
          <Text>Find an order</Text>
        </Link>
      </View>
    );
  }

  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Profile</Text>
      <TextInput value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <Text>{me.email}</Text>
      <TextInput value={phone} onChangeText={setPhone} placeholder="Phone" style={{ borderWidth: 1, padding: 8 }} />
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>Email edits and restocks</Text>
        <Switch value={emailOpt} onValueChange={setEmailOpt} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text>WhatsApp updates</Text>
        <Switch value={waOpt} onValueChange={setWaOpt} />
      </View>
      <Pressable
        onPress={async () => {
          try {
            await api('/account/me', undefined, {
              method: 'PATCH',
              body: JSON.stringify({
                name,
                phone: phone.trim() || null,
                marketingOptIn: emailOpt,
                whatsappOptIn: waOpt,
              }),
            });
            setMsg('Saved.');
          } catch {
            setMsg('Could not save profile.');
          }
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Save</Text>
      </Pressable>
      {msg ? <Text>{msg}</Text> : null}
      <Link href="/legal">
        <Text>Business details and returns</Text>
      </Link>
      <Link href="/size-guide">
        <Text>Size guide</Text>
      </Link>
    </View>
  );
}
