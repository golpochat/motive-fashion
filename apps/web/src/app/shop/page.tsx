import { shopPriceBlurb } from '@motive-fashion/config';
import { pageMeta } from '@/lib/page-meta';
import { ShopView } from './shop-view';

export const metadata = pageMeta(
  'Shop',
  `Shop hijabs, abayas, jilbabs, and prayer sets from Motive Fashion, Dublin. ${shopPriceBlurb()}`,
);

export default async function ShopPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; q?: string; after?: string; size?: string; color?: string; inStock?: string }>;
}) {
  const q = await searchParams;
  return <ShopView category={q.category} q={q.q} after={q.after} size={q.size} color={q.color} inStock={q.inStock} />;
}
