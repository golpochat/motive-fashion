import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

const ACCESS_KEY = 'mf_access';
const CART_KEY = 'mf_cart';
const SESSION_KEY = 'mf_session';

type WebStorage = {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
};

function webStorage(): WebStorage | undefined {
  const g = globalThis as typeof globalThis & { localStorage?: WebStorage };
  return g.localStorage;
}

function newSessionKey() {
  const g = globalThis as typeof globalThis & { crypto?: { randomUUID?: () => string } };
  if (typeof g.crypto?.randomUUID === 'function') {
    return g.crypto.randomUUID();
  }
  return `mf-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

let accessToken: string | undefined;
let cartId: string | undefined;
let sessionKey: string | undefined;
let hydrated = false;

async function read(key: string) {
  try {
    if (Platform.OS === 'web') {
      return webStorage()?.getItem(key) ?? undefined;
    }
    return (await SecureStore.getItemAsync(key)) ?? undefined;
  } catch {
    return undefined;
  }
}

async function write(key: string, value: string | undefined) {
  try {
    if (Platform.OS === 'web') {
      const storage = webStorage();
      if (value) storage?.setItem(key, value);
      else storage?.removeItem(key);
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

export function getSessionKey(): string {
  if (!sessionKey) {
    const next = newSessionKey();
    sessionKey = next;
    void write(SESSION_KEY, next);
    return next;
  }
  return sessionKey;
}
