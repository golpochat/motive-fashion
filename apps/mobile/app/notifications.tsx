import { useEffect } from 'react';
import { Text, View } from 'react-native';
import { registerPushToken } from '../src/push';

export default function NotificationsScreen() {
  useEffect(() => {
    void registerPushToken().catch(() => null);
  }, []);
  return (
    <View style={{ padding: 24 }}>
      <Text style={{ fontSize: 24 }}>Notifications</Text>
      <Text>Order alerts use an Expo push token stored on your account after you allow notifications.</Text>
    </View>
  );
}
