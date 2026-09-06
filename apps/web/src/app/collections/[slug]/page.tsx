import { api, type ProductCard } from '@/lib/api';
import { ProductTile } from '@/components/product-tile';

const BANNERS: Record<string, { src: string; alt: string; blurb: string }> = {
  eid: {
    src: '/brand/banner-eid.jpg',
    alt: 'Eid collection — champagne hijabs and emerald abaya',
    blurb: 'Eid pieces in champagne, sage, and emerald. VAT included.',
  },
  ramadan: {
    src: '/brand/hero-editorial.jpg',
    alt: 'Ramadan collection — abaya and hijab still life',
    blurb: 'Ramadan layers for prayer and evenings at home.',
  },
};

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  let products: ProductCard[];
  try {
    products = await api<ProductCard[]>(`/catalog/products?collection=${slug}`);
  } catch {
    products = [];
  }
  const banner = BANNERS[slug];
  const title = slug.replace('-', ' ');
  return (
    <div>
      {banner ? (
        <section className="relative mb-10 overflow-hidden rounded-3xl">
          <img src={banner.src} alt={banner.alt} className="h-56 w-full object-cover md:h-72" />
          <div className="absolute inset-0 bg-gradient-to-t from-primary/75 to-transparent" />
          <div className="absolute inset-0 flex flex-col justify-end p-6 md:p-8">
            <h1 className="font-serif text-4xl capitalize text-cream">{title}</h1>
            <p className="mt-2 max-w-lg text-sm text-cream/80">{banner.blurb}</p>
          </div>
        </section>
      ) : (
        <h1 className="font-serif text-4xl capitalize">{title}</h1>
      )}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <ProductTile key={p.id} product={p} />
        ))}
      </div>
    </div>
  );
}
