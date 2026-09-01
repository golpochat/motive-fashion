import { useEffect } from 'react';
import { Text, View } from 'react-native';
import * as Notifications from 'expo-notifications';

export default function NotificationsScreen() {
  useEffect(() => {
    Notifications.requestPermissionsAsync().catch(() => null);
  }, []);
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Notifications</Text>
      <Text>Order and restock alerts use Expo push tokens stored on your account.</Text>
    </View>
  );
}
