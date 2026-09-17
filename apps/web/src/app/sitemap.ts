import type { MetadataRoute } from 'next';
import { loadCatalog, loadCatalogPage, type Category, type Collection } from '@/lib/catalog';

const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

const staticPaths = [
  '',
  '/shop',
  '/about',
  '/contact',
  '/size-guide',
  '/legal/terms',
  '/legal/privacy',
  '/legal/returns',
  '/legal/cookies',
  '/collections/eid',
  '/collections/ramadan',
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, collections, categories] = await Promise.all([
    loadCatalogPage('/catalog/products'),
    loadCatalog<Collection[]>('/catalog/collections'),
    loadCatalog<Category[]>('/catalog/categories'),
  ]);

  const extra: string[] = [];
  if (collections.ok) {
    for (const row of collections.data) {
      const path = `/collections/${row.slug}`;
      if (!staticPaths.includes(path)) extra.push(path);
    }
  }
  if (categories.ok) {
    for (const row of categories.data) extra.push(`/shop/${row.slug}`);
  }
  if (products.ok) {
    for (const product of products.data.items) extra.push(`/product/${product.slug}`);
  }

  return [...staticPaths, ...extra].map((path) => ({
    url: `${site}${path}`,
    changeFrequency: path.startsWith('/product/') ? 'daily' : 'weekly',
    priority: path === '' ? 1 : path.startsWith('/product/') ? 0.7 : 0.6,
  }));
}
