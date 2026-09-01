import { api, type ProductCard } from '@/lib/api';
import { ProductTile } from '@/components/product-tile';

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let products: ProductCard[];
  try {
    products = await api<ProductCard[]>(`/catalog/products?collection=${slug}`);
  } catch {
    products = [];
  }
  return (
    <div>
      <h1 className="font-serif text-4xl capitalize">{slug.replace('-', ' ')}</h1>
      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
