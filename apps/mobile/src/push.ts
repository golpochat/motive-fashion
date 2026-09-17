import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import { api } from './api';
import { getAccessToken } from './session';

export async function registerPushToken() {
  const access = getAccessToken();
  if (!access) return;
  const permission = await Notifications.requestPermissionsAsync();
  if (!permission.granted) return;
  const expo = await Notifications.getExpoPushTokenAsync();
  await api('/account/push-tokens', access, {
    method: 'POST',
    body: JSON.stringify({
      token: expo.data,
      platform: Platform.OS === 'android' ? 'android' : 'ios',
    }),
  });
}
