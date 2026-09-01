import ShopPage from '../page';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ category: string }>;
}) {
  const { category } = await params;
  return ShopPage({ searchParams: Promise.resolve({ category }) });
}
