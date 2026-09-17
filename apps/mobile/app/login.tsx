import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api } from '../src/api';
import { setAccessToken } from '../src/session';
import { registerPushToken } from '../src/push';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [msg, setMsg] = useState('');
  return (
    <View style={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Login</Text>
      <TextInput value={email} onChangeText={setEmail} placeholder="Email" autoCapitalize="none" style={{ borderWidth: 1, padding: 8 }} />
      <TextInput value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry style={{ borderWidth: 1, padding: 8 }} />
      <Pressable
        onPress={async () => {
          try {
            const res = await api<{ accessToken: string }>('/auth/login', undefined, {
              method: 'POST',
              body: JSON.stringify({ email, password }),
            });
            setAccessToken(res.accessToken);
            if (res.accessToken) {
              await registerPushToken().catch(() => null);
              setMsg('Signed in');
            } else {
              setMsg('Check details');
            }
          } catch {
            setMsg('Check details');
          }
        }}
        style={{ backgroundColor: '#1c1917', padding: 14, borderRadius: 999 }}
      >
        <Text style={{ color: '#f5f0e8', textAlign: 'center' }}>Continue</Text>
      </Pressable>
      <Text>{msg}</Text>
    </View>
  );
}
