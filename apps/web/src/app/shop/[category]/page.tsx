import { shopPriceBlurb } from '@motive-fashion/config';
import { loadCatalog, type Category } from '@/lib/catalog';
import { pageMeta } from '@/lib/page-meta';
import { ShopView } from '../shop-view';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  const result = await loadCatalog<Category[]>('/catalog/categories');
  const name = result.ok ? result.data.find((c) => c.slug === category)?.name : undefined;
  return pageMeta(
    name ?? 'Shop',
    `Shop ${name ?? 'modest wear'} from Motive Fashion, Dublin. ${shopPriceBlurb()}`,
  );
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<{ category: string }>;
  searchParams: Promise<{ q?: string; after?: string; size?: string; color?: string; inStock?: string }>;
}) {
  const { category } = await params;
  const q = await searchParams;
  return <ShopView category={category} q={q.q} after={q.after} size={q.size} color={q.color} inStock={q.inStock} />;
}
