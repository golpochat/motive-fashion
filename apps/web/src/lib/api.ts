import { fetchAuthed } from './auth-fetch';

export const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

export function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== 'object') return fallback;
  const body = payload as { message?: unknown; issues?: { message?: string }[] };
  const firstIssue = body.issues?.find((issue) => typeof issue.message === 'string')?.message;
  if (typeof body.message === 'string' && body.message && body.message !== 'Validation failed') {
    return body.message;
  }
  if (firstIssue) return firstIssue;
  if (typeof body.message === 'string' && body.message) return body.message;
  return fallback;
}

function apiBase() {
  if (typeof window === 'undefined') {
    return `${process.env.API_ORIGIN ?? 'http://localhost:4000'}/api/v1`;
  }
  return API;
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetchAuthed(`${apiBase()}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
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
  categoryName?: string;
  images: { url: string; alt: string }[];
  variants: {
    id: string;
    sku: string;
    barcode?: string | null;
    size: string;
    color: string;
    fabric?: string | null;
    priceCents: number;
    available: number;
  }[];
};

export function cartSessionKey() {
  let key = localStorage.getItem('mf_session');
  if (!key) {
    key = crypto.randomUUID();
    localStorage.setItem('mf_session', key);
  }
  return key;
}
