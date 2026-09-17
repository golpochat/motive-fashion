import { formatEur, unwrapCatalogList, type CatalogList } from '@motive-fashion/utils';
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

export async function loadCatalogPage(path: string): Promise<CatalogResult<CatalogList<ProductCard>>> {
  const result = await loadCatalog<unknown>(path);
  if (!result.ok) return result;
  return { ok: true, data: unwrapCatalogList<ProductCard>(result.data) };
}

export function variantPriceRange(variants: { priceCents: number }[]) {
  const prices = variants.map((variant) => variant.priceCents).filter((n) => Number.isFinite(n));
  if (!prices.length) return { min: 0, max: 0, mixed: false };
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  return { min, max, mixed: min !== max };
}

export function catalogPriceLabel(variants: { priceCents: number }[]) {
  const { min, mixed } = variantPriceRange(variants);
  return mixed ? `from ${formatEur(min)}` : formatEur(min);
}

export function groupVariantsBySize<T extends { size: string }>(variants: T[]) {
  const groups = new Map<string, T[]>();
  for (const variant of variants) {
    const list = groups.get(variant.size) ?? [];
    list.push(variant);
    groups.set(variant.size, list);
  }
  return [...groups.entries()];
}

export function featuredProducts(products: ProductCard[], slugs: string[], take = 6) {
  const picked = slugs.map((slug) => products.find((p) => p.slug === slug)).filter((p): p is ProductCard => Boolean(p));
  if (picked.length) return picked.slice(0, take);
  return products.slice(0, take);
}
