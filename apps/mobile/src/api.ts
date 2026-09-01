import Constants from 'expo-constants';

export const API =
  (Constants.expoConfig?.extra?.apiUrl as string | undefined) ?? 'http://localhost:4000/api/v1';

export async function api<T>(path: string, token?: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json() as Promise<T>;
}
