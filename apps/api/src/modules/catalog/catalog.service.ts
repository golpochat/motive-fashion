import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma, ReviewStatus } from '../../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { availableStock } from '@motive-fashion/utils';

const DEFAULT_LIMIT = 24;
const MAX_LIMIT = 48;

function encodeCursor(title: string, id: string) {
  return Buffer.from(JSON.stringify({ t: title, i: id }), 'utf8').toString('base64url');
}

function decodeCursor(raw?: string) {
  if (!raw) return null;
  try {
    const value = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as { t?: string; i?: string };
    if (typeof value.t === 'string' && typeof value.i === 'string') return { t: value.t, i: value.i };
  } catch {
    /* ignore */
  }
  return null;
}

@Injectable()
export class CatalogService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  categories() {
    return this.prisma.category.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  collections() {
    return this.prisma.collection.findMany({
      where: { published: true },
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      select: {
        slug: true,
        name: true,
        description: true,
        inNav: true,
        bannerPath: true,
        sortOrder: true,
      },
    });
  }

  async list(filters: {
    category?: string;
    collection?: string;
    q?: string;
    occasion?: string;
    sku?: string;
    size?: string;
    color?: string;
    inStock?: boolean;
    cursor?: string;
    limit?: number;
  }) {
    const limit = Math.min(MAX_LIMIT, Math.max(1, filters.limit ?? DEFAULT_LIMIT));
    const cursor = decodeCursor(filters.cursor);
    const variantSome: Prisma.ProductVariantWhereInput = {
      active: true,
      ...(filters.size ? { size: { equals: filters.size, mode: 'insensitive' as const } } : {}),
      ...(filters.color ? { color: { equals: filters.color, mode: 'insensitive' as const } } : {}),
      ...(filters.inStock ? { inventory: { some: { onHand: { gt: 0 } } } } : {}),
    };
    const variantFilter =
      filters.size || filters.color || filters.inStock || filters.sku
        ? {
            variants: {
              some: {
                ...variantSome,
                ...(filters.sku
                  ? {
                      OR: [
                        { sku: { equals: filters.sku, mode: 'insensitive' as const } },
                        { barcode: { equals: filters.sku, mode: 'insensitive' as const } },
                      ],
                    }
                  : {}),
              },
            },
          }
        : {};
    const where: Prisma.ProductWhereInput = {
      published: true,
      ...(filters.category ? { category: { slug: filters.category } } : {}),
      ...(filters.occasion ? { occasion: filters.occasion } : {}),
      ...(filters.q
        ? {
            OR: [
              { title: { contains: filters.q, mode: 'insensitive' } },
              { description: { contains: filters.q, mode: 'insensitive' } },
              { variants: { some: { sku: { contains: filters.q, mode: 'insensitive' } } } },
              { variants: { some: { barcode: { contains: filters.q, mode: 'insensitive' } } } },
            ],
          }
        : {}),
      ...(filters.collection
        ? { collections: { some: { collection: { slug: filters.collection, published: true } } } }
        : {}),
      ...variantFilter,
      ...(cursor
        ? {
            OR: [{ title: { gt: cursor.t } }, { title: cursor.t, id: { gt: cursor.i } }],
          }
        : {}),
    };
    const products = await this.prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { sortOrder: 'asc' }, take: 1 },
        category: true,
        variants: { where: { active: true }, include: { inventory: true } },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
      take: limit + 1,
    });
    const page = products.slice(0, limit);
    const last = page[page.length - 1];
    return {
      items: page.map((p) => this.toDto(p)),
      nextCursor: products.length > limit && last ? encodeCursor(last.title, last.id) : null,
    };
  }

  async bySlug(slug: string) {
    const product = await this.prisma.product.findUnique({
      where: { slug },
      include: {
        images: { orderBy: { sortOrder: 'asc' } },
        category: true,
        variants: { where: { active: true }, include: { inventory: true } },
        reviews: {
          where: { status: ReviewStatus.APPROVED },
          include: { user: { select: { name: true } } },
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
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
      barcode: string | null;
      size: string;
      color: string;
      fabric: string | null;
      priceCents: number;
      compareAtCents: number | null;
      inventory: { onHand: number; reserved: number }[];
    }[];
    reviews?: { rating: number; body: string; user: { name: string }; createdAt?: Date }[];
  }) {
    const reviews = (product.reviews ?? []).map((review) => ({
      rating: review.rating,
      body: review.body,
      name: review.user.name,
      createdAt: review.createdAt,
    }));
    const ratingCount = reviews.length;
    const ratingAvg = ratingCount
      ? reviews.reduce((sum, row) => sum + row.rating, 0) / ratingCount
      : null;
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
          barcode: v.barcode,
          size: v.size,
          color: v.color,
          fabric: v.fabric,
          priceCents: v.priceCents,
          compareAtCents: v.compareAtCents,
          available: availableStock(onHand, reserved),
        };
      }),
      reviews,
      ratingAvg,
      ratingCount,
    };
  }
}
