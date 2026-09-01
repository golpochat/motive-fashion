export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000/api/v1';

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
    credentials: 'include',
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || res.statusText);
  }
  return res.json() as Promise<T>;
}

export type ProductCard = {
  id: string;
  slug: string;
  title: string;
  description: string;
  categorySlug: string;
  images: { url: string; alt: string }[];
  variants: { id: string; sku: string; size: string; color: string; priceCents: number; available: number }[];
};
