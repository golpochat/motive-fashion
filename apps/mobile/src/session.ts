import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'mf_access';
const CART_KEY = 'mf_cart';
const SESSION_KEY = 'mf_session';

let accessToken: string | undefined;
let cartId: string | undefined;
let sessionKey: string | undefined;
let hydrated = false;

function newSessionKey() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `mf-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

async function read(key: string) {
  try {
    if (Platform.OS === 'web') {
      return globalThis.localStorage?.getItem(key) ?? undefined;
    }
    return (await SecureStore.getItemAsync(key)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function write(key: string, value: string | undefined) {
  try {
    if (Platform.OS === 'web') {
      if (value) globalThis.localStorage?.setItem(key, value);
      else globalThis.localStorage?.removeItem(key);
      return;
    }
    if (value) await SecureStore.setItemAsync(key, value);
    else await SecureStore.deleteItemAsync(key);
  } catch {
    /* keep in-memory value */
  }
}

export async function hydrateSession() {
  if (hydrated) return;
  accessToken = await read(ACCESS_KEY);
  cartId = await read(CART_KEY);
  sessionKey = await read(SESSION_KEY);
  hydrated = true;
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token: string | undefined) {
  accessToken = token;
  void write(ACCESS_KEY, token);
}

export function getCartId() {
  return cartId;
}

export function setCartId(id: string) {
  cartId = id;
  void write(CART_KEY, id);
}

export function getSessionKey() {
  if (!sessionKey) {
    sessionKey = newSessionKey();
    void write(SESSION_KEY, sessionKey);
  }
  return sessionKey;
}
