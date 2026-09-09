import { api, type ProductCard } from '@/lib/api';

export type CatalogOk<T> = { ok: true; data: T };
export type CatalogErr = { ok: false };
export type CatalogResult<T> = CatalogOk<T> | CatalogErr;

export type Category = { slug: string; name: string };
export type Collection = { slug: string; name: string; description?: string | null };

export async function loadCatalog<T>(path: string): Promise<CatalogResult<T>> {
  try {
    return { ok: true, data: await api<T>(path) };
  } catch {
    return { ok: false };
  }
}

export function featuredProducts(products: ProductCard[], slugs: string[], take = 6) {
  const picked = slugs.map((slug) => products.find((p) => p.slug === slug)).filter((p): p is ProductCard => Boolean(p));
  if (picked.length) return picked.slice(0, take);
  return products.slice(0, take);
}
