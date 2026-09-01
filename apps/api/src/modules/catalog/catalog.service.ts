import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { availableStock } from '@motive-fashion/utils';

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  collections() {
    return this.prisma.collection.findMany({ orderBy: { name: 'asc' } });
  }

  async list(filters: {
    category?: string;
    collection?: string;
    q?: string;
    occasion?: string;
    sku?: string;
  }) {
    const products = await this.prisma.product.findMany({
      where: {
        published: true,
        ...(filters.category ? { category: { slug: filters.category } } : {}),
        ...(filters.occasion ? { occasion: filters.occasion } : {}),
        ...(filters.q
          ? {
              OR: [
                { title: { contains: filters.q, mode: 'insensitive' } },
                { description: { contains: filters.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(filters.collection
          ? { collections: { some: { collection: { slug: filters.collection } } } }
          : {}),
        ...(filters.sku ? { variants: { some: { sku: filters.sku } } } : {}),
      },
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: true,
        variants: { where: { active: true }, include: { inventory: true } },
      },
      orderBy: { title: 'asc' },
      take: 48,
    });
    return products.map((p) => this.toDto(p));
  }

  async bySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: { where: { active: true }, include: { inventory: true } },
        reviews: { include: { user: { select: { name: true } } }, take: 20 },
      },
    });
    if (!product) throw new NotFoundException();
    return this.toDto(product);
  }

  private toDto(product: {
    id: string;
    slug: string;
    title: string;
    description: string;
    occasion: string | null;
    coverage: string | null;
    opacity: string | null;
    hijabStyle: string | null;
    prayerReady: boolean;
    care: string | null;
    originCountry: string | null;
    category: { slug: string; name: string };
    images: { url: string; alt: string }[];
    variants: {
      id: string;
      sku: string;
      size: string;
      color: string;
      fabric: string | null;
      priceCents: number;
      compareAtCents: number | null;
      inventory: { onHand: number; reserved: number }[];
    }[];
    reviews?: { rating: number; body: string; user: { name: string } }[];
  }) {
    return {
      id: product.id,
      slug: product.slug,
      title: product.title,
      description: product.description,
      occasion: product.occasion,
      coverage: product.coverage,
      opacity: product.opacity,
      hijabStyle: product.hijabStyle,
      prayerReady: product.prayerReady,
      care: product.care,
      originCountry: product.originCountry,
      categorySlug: product.category.slug,
      categoryName: product.category.name,
      images: product.images,
      variants: product.variants.map((v) => {
        const onHand = v.inventory.reduce((s, i) => s + i.onHand, 0);
        const reserved = v.inventory.reduce((s, i) => s + i.reserved, 0);
        return {
          id: v.id,
          sku: v.sku,
          size: v.size,
          color: v.color,
          fabric: v.fabric,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents,
          available: availableStock(onHand, reserved),
        };
      }),
      reviews: product.reviews ?? [],
    };
  }
}
