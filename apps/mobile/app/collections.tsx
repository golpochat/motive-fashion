import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Link } from 'expo-router';
import { shopPriceBlurb } from '@motive-fashion/config';
import { api } from '../src/api';

type Collection = { slug: string; name: string; description?: string | null };

export default function Collections() {
  const [rows, setRows] = useState<Collection[]>([]);
  useEffect(() => {
    api<Collection[]>('/catalog/collections')
      .then(setRows)
      .catch(() => setRows([]));
  }, []);
  return (
    <ScrollView contentContainerStyle={{ padding: 24, gap: 16 }}>
      <Text style={{ fontSize: 24 }}>Collections</Text>
      <Text>{shopPriceBlurb()}</Text>
      {rows.map((row) => (
        <Link key={row.slug} href={`/collection/${row.slug}`} asChild>
          <Pressable style={{ paddingVertical: 12, borderBottomWidth: 1, borderColor: '#e7e5e4' }}>
            <Text style={{ fontSize: 18 }}>{row.name}</Text>
            {row.description ? <Text>{row.description}</Text> : null}
          </Pressable>
        </Link>
      ))}
      {rows.length === 0 ? <Text>Published collections appear here when a season is live.</Text> : null}
    </ScrollView>
  );
}
