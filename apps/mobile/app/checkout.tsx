import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import * as Linking from 'expo-linking';
import { isValidEircode, normalizeEircode, priceTaxSuffix, BRAND, legalDisplayName } from '@motive-fashion/config';
import { api, formatEur } from '../src/api';
import { ensureCart } from '../src/cart';
import { getSessionKey } from '../src/session';

type Fulfilment = { code: 'DELIVERY' | 'COLLECTION'; name: string };
type County = { code: string; name: string; rateCents: number };
type Options = {
  blocked: string | null;
  fulfilment: Fulfilment[];
  counties: County[];
  defaultFulfilment: 'DELIVERY' | 'COLLECTION';
  returnNotice: string;
};

export default function Checkout() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [fulfillment, setFulfillment] = useState<'DELIVERY' | 'COLLECTION'>('DELIVERY');
  const [eircode, setEircode] = useState('');
  const [line1, setLine1] = useState('');
  const [city, setCity] = useState('');
  const [county, setCounty] = useState('');
  const [options, setOptions] = useState<Options | null>(null);
  const [msg, setMsg] = useState('');
  const [total, setTotal] = useState('');

  useEffect(() => {
    api<Options>('/checkout/options')
      .then((data) => {
        setOptions(data);
        setFulfillment(data.defaultFulfilment);
        setCounty(data.counties[0]?.code ?? '');
      })
      .catch(() => setMsg('Could not load checkout options'));
  }, []);

  useEffect(() => {
    void (async () => {
      try {
        const cart = await ensureCart();
        const quote = await api<{ totalCents: number }>('/checkout/quote', undefined, {
          method: 'POST',
          body: JSON.stringify({
            cartId: cart.id,
            sessionKey: getSessionKey(),
            fulfillment,
            county: fulfillment === 'DELIVERY' ? county : undefined,
          }),
        });
        setTotal(formatEur(quote.totalCents));
      } catch {
        setTotal('');
      }
    })();
  }, [fulfillment, county]);

  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 12 }}>
      <Text style={{ fontSize: 24 }}>Checkout</Text>
      {options?.blocked ? <Text>{options.blocked}</Text> : null}
      <TextInput placeholder="Name" value={name} onChangeText={setName} style={{ borderWidth: 1, padding: 8 }} />
      <TextInput
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        style={{ borderWidth: 1, padding: 8 }}
      />
      <TextInput placeholder="Phone" value={phone} onChangeText={setPhone} style={{ borderWidth: 1, padding: 8 }} />
      <View style={{ flexDirection: 'row', gap: 8 }}>
        {(options?.fulfilment ?? []).map((row) => (
          <Pressable
            key={row.code}
            onPress={() => setFulfillment(row.code)}
            style={{
              flex: 1,
              padding: 12,
              borderRadius: 12,
              borderWidth: 1,
              borderColor: fulfillment === row.code ? '#b45309' : '#d6d3d1',
            }}
          >
            <Text style={{ textAlign: 'center' }}>{row.name}</Text>
          </Pressable>
        ))}
      </View>
      {fulfillment === 'DELIVERY' ? (
        <View style={{ gap: 8 }}>
          <TextInput
            placeholder="Eircode"
            value={eircode}
            autoCapitalize="characters"
            onChangeText={setEircode}
            style={{ borderWidth: 1, padding: 8 }}
          />
          <TextInput placeholder="Address line 1" value={line1} onChangeText={setLine1} style={{ borderWidth: 1, padding: 8 }} />
          <TextInput placeholder="Town or city" value={city} onChangeText={setCity} style={{ borderWidth: 1, padding: 8 }} />
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {(options?.counties ?? []).map((row) => (
              <Pressable
                key={row.code}
                onPress={() => setCounty(row.code)}
                style={{
                  paddingHorizontal: 10,
                  paddingVertical: 8,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: county === row.code ? '#b45309' : '#d6d3d1',
                }}
              >
                <Text>{row.name}</Text>
              </Pressable>
            ))}
          </View>
        </View>
      ) : (
        <Text>Collect in Dublin after payment.</Text>
      )}
      <Text>{options?.returnNotice}</Text>
      <Text>
        Buying from {legalDisplayName()}, sole trader, Dublin. {BRAND.returnDays}-day withdrawal after delivery or collection.
      </Text>
      {total ? <Text>Total {total}{priceTaxSuffix()}</Text> : null}
      <Pressable
        onPress={async () => {
          try {
            if (fulfillment === 'DELIVERY') {
              const code = normalizeEircode(eircode);
              if (!isValidEircode(code) || line1.trim().length < 3 || city.trim().length < 2 || !county) {
                setMsg('Enter a valid Eircode, address, town, and county.');
                return;
              }
            }
            const cart = await ensureCart();
            const sessionKey = getSessionKey();
            const order = await api<{ id: string; trackingToken: string }>('/checkout/session', undefined, {
              method: 'POST',
              body: JSON.stringify({
                cartId: cart.id,
                sessionKey,
                fulfillment,
                email,
                name,
                phone: phone || undefined,
                returnPolicyAck: true,
                ...(fulfillment === 'DELIVERY'
                  ? {
                      county,
                      address: {
                        line1,
                        city,
                        county,
                        eircode: normalizeEircode(eircode),
                        country: 'IE',
                      },
                    }
                  : {}),
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
    </ScrollView>
  );
}
