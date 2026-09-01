import { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { hydrateSession } from '../src/session';

export default function Layout() {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    void hydrateSession().then(() => setReady(true));
  }, []);

  if (!ready) return null;

  return (
    <Stack
      screenOptions={{
        headerTitle: 'Motive Fashion',
        headerTintColor: '#1c1917',
        contentStyle: { backgroundColor: '#f5f0e8' },
      }}
    />
  );
}
