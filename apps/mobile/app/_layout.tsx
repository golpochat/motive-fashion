import { Stack } from 'expo-router';

export default function Layout() {
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
