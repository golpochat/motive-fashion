import { BadRequestException, Body, Controller, Delete, Get, Header, Inject, NotFoundException, Param, Patch, Post, Query, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrderStatus, Prisma, ReturnStatus, ReviewStatus, UserRole } from '../../../generated/prisma';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions, RequireWorkspace } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CommerceService } from '../commerce/commerce.service';
import {
  productCreateSchema,
  productPatchSchema,
  variantCreateSchema,
  variantBulkCreateSchema,
  variantPatchSchema,
  promoCreateSchema,
  promoPatchSchema,
  orderStatusSchema,
  refundSchema,
  resolveReturnSchema,
  fulfilmentPatchSchema,
  countyPatchSchema,
  paymentPatchSchema,
  locationCreateSchema,
  locationPatchSchema,
  collectionCreateSchema,
  collectionPatchSchema,
  reviewModerateSchema,
} from '@motive-fashion/validation';
import { slugify, styleComboKey, styleDefaultsForCategory } from '@motive-fashion/utils';
import { customerPublicSelect } from '../../common/user-select';
import { writeAudit, listAuditLogs, exportAuditCsv } from '../../common/audit';
import { saveProductImage, uploadDir } from '../../common/media';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';
import type { Response } from 'express';
import { paidCreatedAt, fillDailySeries, seriesRange } from './analytics-where';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
  ) {}

  @Get('analytics/export')
  @RequirePermissions('analytics.read')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="analytics.csv"')
  async exportAnalytics(@Query('from') from: string | undefined, @Query('to') to: string | undefined, @Res() res: Response) {
    const data = await this.analytics(from, to);
    const lines = [
      ['section', 'key', 'value'].join(','),
      ['summary', 'revenueCents', String(data.revenueCents)].join(','),
      ['summary', 'orders', String(data.orderCount)].join(','),
      ['summary', 'aovCents', String(data.aovCents)].join(','),
      ...data.byChannel.map((row) => ['channel', csvCell(row.channel), String(row._sum.totalCents ?? 0)].join(',')),
      ...data.byFulfilment.map((row) => ['fulfilment', csvCell(row.fulfillment), String(row._sum.totalCents ?? 0)].join(',')),
      ...data.topSkus.map((row) => ['sku', csvCell(row.sku), String(row._sum.quantity ?? 0)].join(',')),
      ...data.series.map((row) => ['day', row.date, `${row.orders}|${row.revenueCents}`].join(',')),
    ];
    res.send(lines.join('\n'));
  }

  @Get('analytics')
  @RequirePermissions('analytics.read')
  async analytics(@Query('from') from?: string, @Query('to') to?: string) {
    const paidWhere = paidCreatedAt(from, to);
    const seriesWindow = seriesRange(from, to);
    const [orderAgg, orders, fulfilment, low, toPack, unpublished, noPhoto, openReturns, seriesRows] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        _count: true,
        where: paidWhere,
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        _sum: { totalCents: true },
        _count: true,
        where: paidWhere,
      }),
      this.prisma.order.groupBy({
        by: ['fulfillment'],
        _sum: { totalCents: true },
        _count: true,
        where: paidWhere,
      }),
      this.prisma.inventoryLevel.count({
        where: { onHand: { lte: 5 } },
      }),
      this.prisma.order.count({
        where: { status: { in: [OrderStatus.CONFIRMED, OrderStatus.PACKING] } },
      }),
      this.prisma.product.count({ where: { published: false } }),
      this.prisma.product.count({ where: { images: { none: {} } } }),
      this.prisma.return.count({
        where: { status: { in: [ReturnStatus.REQUESTED, ReturnStatus.APPROVED, ReturnStatus.RECEIVED] } },
      }),
      this.prisma.order.findMany({
        where: paidCreatedAt(seriesWindow.from, seriesWindow.to),
        select: { createdAt: true, totalCents: true },
      }),
    ]);
    const top = await this.prisma.orderItem.groupBy({
      by: ['sku', 'title'],
      _sum: { quantity: true },
      where: { order: paidWhere },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });
    const orderCount = orderAgg._count;
    const revenueCents = orderAgg._sum.totalCents ?? 0;
    return {
      revenueCents,
      orderCount,
      aovCents: orderCount ? Math.round(revenueCents / orderCount) : 0,
      stockouts: low,
      byChannel: orders,
      byFulfilment: fulfilment,
      series: fillDailySeries(seriesWindow.from, seriesWindow.to, seriesRows),
      topSkus: top,
      from: from ?? null,
      to: to ?? null,
      next: {
        pack: toPack,
        unpublished,
        noPhoto,
        returns: openReturns,
        lowStock: low,
      },
    };
  }

  @Get('products')
  @RequirePermissions('catalog.read')
  products() {
    return this.prisma.product.findMany({
      include: { category: true, images: true, variants: { include: { inventory: true } } },
      orderBy: { title: 'asc' },
    });
  }

  @Get('search')
  @RequirePermissions('orders.read')
  @RequireWorkspace('admin')
  async search(@Query('q') q: string, @CurrentUser() user: { permissions?: string[] }) {
    const needle = (q ?? '').trim();
    if (needle.length < 2) return { products: [], orders: [], customers: [], coupons: [] };
    const keys = user.permissions ?? [];
    const term = { contains: needle, mode: 'insensitive' as const };
    const [products, orders, customers, coupons] = await Promise.all([
      keys.includes('catalog.read')
        ? this.prisma.product.findMany({
            where: {
              OR: [
                { title: term },
                { slug: term },
                { variants: { some: { OR: [{ sku: term }, { barcode: term }] } } },
              ],
            },
            take: 8,
            orderBy: { title: 'asc' },
            select: { id: true, title: true, slug: true, published: true },
          })
        : Promise.resolve([]),
      this.prisma.order.findMany({
        where: {
          OR: [{ email: term }, { name: term }, { id: { startsWith: needle } }],
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
        select: { id: true, email: true, name: true, status: true, totalCents: true },
      }),
      keys.includes('customers.read')
        ? this.prisma.user.findMany({
            where: { role: UserRole.CUSTOMER, deletedAt: null, OR: [{ email: term }, { name: term }, { phone: term }] },
            take: 8,
            orderBy: { name: 'asc' },
            select: { id: true, name: true, email: true },
          })
        : Promise.resolve([]),
      keys.includes('marketing.write')
        ? this.prisma.promoCode.findMany({
            where: { code: term },
            take: 5,
            orderBy: { code: 'asc' },
            select: { id: true, code: true, active: true },
          })
        : Promise.resolve([]),
    ]);
    return {
      products,
      orders: orders.map((order) => ({
        ...order,
        ticket: order.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      })),
      customers,
      coupons,
    };
  }

  @Post('products')
  @RequirePermissions('catalog.write')
  async createProduct(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = productCreateSchema.parse(body);
    const category = await this.prisma.category.findUnique({ where: { id: dto.categoryId } });
    if (!category) throw new BadRequestException('Unknown category.');
    const defaults = styleDefaultsForCategory(category.slug);
    const { variants, ...productData } = dto;
    try {
      const product = await this.prisma.$transaction(async (tx) => {
        const created = await tx.product.create({
          data: {
            ...productData,
            slug: dto.slug?.trim() || slugify(dto.title),
            occasion: dto.occasion ?? defaults.occasion,
            coverage: dto.coverage ?? defaults.coverage ?? undefined,
            prayerReady: dto.prayerReady ?? defaults.prayerReady,
            published: dto.published ?? false,
            variants: variants?.length
              ? {
                  create: variants.map((variant) => ({
                    ...variant,
                    barcode: variant.barcode?.trim() || variant.sku,
                    fabric: variant.fabric ?? defaults.fabric,
                    weightGrams: defaults.weightGrams,
                  })),
                }
              : undefined,
          },
          include: { category: true, variants: true, images: true },
        });
        await writeAudit(tx, {
          actorId: user.sub,
          action: 'product.create',
          entity: 'Product',
          entityId: created.id,
        });
        return created;
      });
      return product;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('A product or SKU with this code already exists.');
      }
      throw err;
    }
  }

  @Patch('products/:id')
  @RequirePermissions('catalog.write')
  async updateProduct(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = productPatchSchema.parse(body);
    const product = await this.prisma.product.update({ where: { id }, data: dto });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'product.update',
      entity: 'Product',
      entityId: id,
      meta: dto,
    });
    return product;
  }

  @Post('products/:id/variants')
  @RequirePermissions('catalog.write')
  async addVariant(@Param('id') productId: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const bulk = (body as { variants?: unknown })?.variants
      ? variantBulkCreateSchema.parse(body).variants
      : [variantCreateSchema.parse(body)];
    const product = await this.prisma.product.findUnique({
      where: { id: productId },
      include: { category: true, variants: true },
    });
    if (!product) throw new BadRequestException('Product not found');
    const defaults = styleDefaultsForCategory(product.category.slug);
    const existing = new Set(product.variants.map((row) => styleComboKey(row.size, row.color)));
    for (const dto of bulk) {
      if (existing.has(styleComboKey(dto.size, dto.color))) {
        throw new BadRequestException(`${dto.size} / ${dto.color} is already on this product.`);
      }
      existing.add(styleComboKey(dto.size, dto.color));
    }
    try {
      const created = await this.prisma.$transaction(async (tx) => {
        const rows = [];
        for (const dto of bulk) {
          const variant = await tx.productVariant.create({
            data: {
              ...dto,
              productId,
              barcode: dto.barcode?.trim() || dto.sku,
              fabric: dto.fabric ?? defaults.fabric,
              weightGrams: defaults.weightGrams,
            },
          });
          await writeAudit(tx, {
            actorId: user.sub,
            action: 'product.variant.create',
            entity: 'ProductVariant',
            entityId: variant.id,
            meta: { productId, sku: dto.sku },
          });
          rows.push(variant);
        }
        return rows;
      });
      return bulk.length === 1 ? created[0] : created;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That SKU or barcode is already in use.');
      }
      throw err;
    }
  }

  @Patch('products/:id/variants/:variantId')
  @RequirePermissions('catalog.write')
  async updateVariant(
    @Param('id') productId: string,
    @Param('variantId') variantId: string,
    @Body() body: unknown,
    @CurrentUser() user: { sub: string },
  ) {
    const dto = variantPatchSchema.parse(body);
    const variant = await this.prisma.productVariant.findFirst({ where: { id: variantId, productId } });
    if (!variant) throw new BadRequestException('SKU not found');
    const nextSize = dto.size ?? variant.size;
    const nextColor = dto.color ?? variant.color;
    const clash = await this.prisma.productVariant.findFirst({
      where: {
        productId,
        id: { not: variantId },
        size: { equals: nextSize, mode: 'insensitive' },
        color: { equals: nextColor, mode: 'insensitive' },
      },
    });
    if (clash) throw new BadRequestException(`${nextSize} / ${nextColor} is already on this product.`);
    try {
      const updated = await this.prisma.productVariant.update({ where: { id: variantId }, data: dto });
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'product.variant.update',
        entity: 'ProductVariant',
        entityId: variantId,
        meta: { productId, ...dto },
      });
      return updated;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That SKU or barcode is already in use.');
      }
      throw err;
    }
  }

  @Post('products/:id/images')
  @RequirePermissions('catalog.write')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 4_000_000 } }))
  async addImage(
    @Param('id') productId: string,
    @UploadedFile() file: { buffer?: Buffer; path?: string; mimetype?: string; size?: number; originalname?: string },
    @Body() body: { alt?: string },
    @CurrentUser() user: { sub: string },
  ) {
    const product = await this.prisma.product.findUnique({ where: { id: productId }, include: { images: true } });
    if (!product) throw new BadRequestException('Product not found');
    const saved = saveProductImage(file);
    const image = await this.prisma.productImage.create({
      data: {
        productId,
        url: saved.url,
        alt: String(body.alt || product.title).slice(0, 120),
        sortOrder: product.images.length,
      },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'product.image.create',
      entity: 'ProductImage',
      entityId: image.id,
      meta: { productId, url: saved.url },
    });
    return image;
  }

  @Delete('products/:id/images/:imageId')
  @RequirePermissions('catalog.write')
  async removeImage(
    @Param('id') productId: string,
    @Param('imageId') imageId: string,
    @CurrentUser() user: { sub: string },
  ) {
    const image = await this.prisma.productImage.findFirst({ where: { id: imageId, productId } });
    if (!image) throw new BadRequestException('Image not found');
    const filename = image.url.split('/').pop();
    if (filename && filename.includes('.')) {
      const path = join(uploadDir(), filename);
      if (existsSync(path)) unlinkSync(path);
    }
    await this.prisma.productImage.delete({ where: { id: imageId } });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'product.image.delete',
      entity: 'ProductImage',
      entityId: imageId,
      meta: { productId },
    });
    return { ok: true as const };
  }

  @Get('inventory')
  @RequirePermissions('inventory.read')
  inventory() {
    return this.prisma.inventoryLevel.findMany({
      include: { variant: { include: { product: true } }, location: true },
    });
  }

  @Get('orders')
  @RequirePermissions('orders.read')
  orderList(@Query('status') status?: OrderStatus) {
    return this.orders.listAdmin(status);
  }

  @Get('orders/:id/pack')
  @RequirePermissions('orders.pack')
  packSheet(@Param('id') id: string) {
    return this.orders.packSheet(id);
  }

  @Get('refunds')
  @RequirePermissions('orders.refund')
  refunds() {
    return this.orders.listRefunds();
  }

  @Post('orders/:id/status')
  @RequirePermissions('orders.pack')
  setStatus(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = orderStatusSchema.parse(body);
    return this.orders.transition(id, dto.status, user.sub, {
      carrier: dto.carrier,
      trackingNo: dto.trackingNo,
    });
  }

  @Post('orders/:id/refund')
  @RequirePermissions('orders.refund')
  refund(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = refundSchema.parse(body);
    return this.orders.refund(id, dto.amountCents, dto.reason, user.sub);
  }

  @Get('customers')
  @RequirePermissions('customers.read')
  customers() {
    return this.prisma.user.findMany({
      where: { role: UserRole.CUSTOMER, deletedAt: null },
      select: { ...customerPublicSelect, _count: { select: { orders: true } } },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('customers/:id')
  @RequirePermissions('customers.read')
  async customer(@Param('id') id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: UserRole.CUSTOMER, deletedAt: null },
      select: {
        ...customerPublicSelect,
        addresses: true,
        orders: {
          orderBy: { createdAt: 'desc' },
          take: 20,
          select: {
            id: true,
            status: true,
            channel: true,
            fulfillment: true,
            totalCents: true,
            createdAt: true,
          },
        },
        _count: { select: { orders: true } },
      },
    });
    if (!user) throw new NotFoundException('Customer not found');
    return {
      ...user,
      orders: user.orders.map((order) => ({
        ...order,
        ticket: order.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      })),
    };
  }

  @Get('locations')
  @RequirePermissions('locations.read')
  locations() {
    return this.prisma.location.findMany({ orderBy: { name: 'asc' } });
  }

  @Post('locations')
  @RequirePermissions('dashboard.admin')
  async createLocation(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = locationCreateSchema.parse(body);
    try {
      const location = await this.prisma.location.create({
        data: { ...dto, code: dto.code.toUpperCase() },
      });
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'location.create',
        entity: 'Location',
        entityId: location.id,
      });
      return location;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That location code is already in use');
      }
      throw err;
    }
  }

  @Patch('locations/:id')
  @RequirePermissions('dashboard.admin')
  async updateLocation(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = locationPatchSchema.parse(body);
      const location = await this.prisma.location.update({ where: { id }, data: dto });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'location.update',
      entity: 'Location',
      entityId: id,
      meta: dto,
    });
    return location;
  }

  @Get('collections')
  @RequirePermissions('catalog.read')
  adminCollections() {
    return this.prisma.collection.findMany({
      orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
      include: { _count: { select: { products: true } } },
    });
  }

  @Post('collections')
  @RequirePermissions('catalog.write')
  async createCollection(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = collectionCreateSchema.parse(body);
    const slug = slugify(dto.slug?.trim() || dto.name);
    try {
      const collection = await this.prisma.collection.create({
        data: {
          name: dto.name,
          slug,
          description: dto.description || null,
          season: dto.season ?? 'EVERYDAY',
          published: dto.published ?? false,
          inNav: dto.inNav ?? false,
          sortOrder: dto.sortOrder ?? 0,
          bannerPath: dto.bannerPath || null,
        },
      });
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'collection.create',
        entity: 'Collection',
        entityId: collection.id,
      });
      return collection;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That collection slug is already in use');
      }
      throw err;
    }
  }

  @Patch('collections/:id')
  @RequirePermissions('catalog.write')
  async updateCollection(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = collectionPatchSchema.parse(body);
    const data = {
      ...dto,
      slug: undefined,
      ...(dto.slug ? { slug: slugify(dto.slug) } : {}),
      ...(dto.description !== undefined ? { description: dto.description || null } : {}),
      ...(dto.bannerPath !== undefined ? { bannerPath: dto.bannerPath || null } : {}),
    };
    try {
      const collection = await this.prisma.collection.update({ where: { id }, data });
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'collection.update',
        entity: 'Collection',
        entityId: id,
        meta: dto,
      });
      return collection;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That collection slug is already in use');
      }
      throw err;
    }
  }

  @Delete('collections/:id')
  @RequirePermissions('catalog.write')
  async deleteCollection(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    await this.prisma.collection.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'collection.delete',
      entity: 'Collection',
      entityId: id,
    });
    return { ok: true };
  }

  @Get('returns')
  @RequirePermissions('orders.read')
  returns() {
    return this.prisma.return.findMany({
      include: { items: { include: { orderItem: true } }, order: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  @Post('returns/:id')
  @RequirePermissions('orders.pack')
  resolveReturn(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = resolveReturnSchema.parse(body);
    return this.orders.resolveReturn(id, dto.status, user.sub);
  }

  @Get('reviews')
  @RequirePermissions('reviews.moderate')
  reviews(@Query('status') status?: ReviewStatus) {
    return this.prisma.review.findMany({
      where: status ? { status } : {},
      include: { user: { select: { name: true, email: true } }, product: { select: { title: true, slug: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  @Post('reviews/:id')
  @RequirePermissions('reviews.moderate')
  async moderateReview(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = reviewModerateSchema.parse(body);
    const review = await this.prisma.review.update({ where: { id }, data: { status: dto.status } });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: `review.${dto.status.toLowerCase()}`,
      entity: 'Review',
      entityId: id,
    });
    return review;
  }

  @Get('audit')
  @RequirePermissions('audit.read')
  @RequireWorkspace('admin')
  audit(@Query('entity') entity?: string, @Query('action') action?: string, @Query('cursor') cursor?: string) {
    return listAuditLogs(this.prisma, { entity, action, cursor, scope: 'commerce' });
  }

  @Get('audit/export')
  @RequirePermissions('audit.read')
  @RequireWorkspace('admin')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="audit.csv"')
  async exportAudit(@Res() res: Response) {
    res.send(await exportAuditCsv(this.prisma, { scope: 'commerce' }));
  }

  @Get('promo-codes')
  @RequirePermissions('marketing.write')
  promos() {
    return this.prisma.promoCode.findMany({ orderBy: { code: 'asc' } });
  }

  @Post('promo-codes')
  @RequirePermissions('marketing.write')
  async createPromo(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = promoCreateSchema.parse(body);
    try {
      const promo = await this.prisma.promoCode.create({
        data: {
          code: dto.code.toUpperCase(),
          type: dto.type,
          value: dto.value,
          active: dto.active ?? true,
          maxUses: dto.maxUses ?? undefined,
          startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
          endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
        },
      });
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'promo.create',
        entity: 'PromoCode',
        entityId: promo.id,
        meta: { type: dto.type, value: dto.value, maxUses: dto.maxUses ?? null },
      });
      return promo;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        throw new BadRequestException('That coupon code is already in use');
      }
      throw err;
    }
  }

  @Patch('promo-codes/:id')
  @RequirePermissions('marketing.write')
  async patchPromo(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = promoPatchSchema.parse(body);
    const data = {
      ...dto,
      startsAt: dto.startsAt === undefined ? undefined : dto.startsAt ? new Date(dto.startsAt) : null,
      endsAt: dto.endsAt === undefined ? undefined : dto.endsAt ? new Date(dto.endsAt) : null,
    };
    const promo = await this.prisma.promoCode.update({ where: { id }, data });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'promo.update',
      entity: 'PromoCode',
      entityId: id,
      meta: dto,
    });
    return promo;
  }

  @Get('commerce')
  @RequirePermissions('commerce.settings')
  commerceSettings() {
    return this.commerce.adminSnapshot();
  }

  @Patch('commerce/fulfilment/:id')
  @RequirePermissions('commerce.settings')
  async patchFulfilment(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = fulfilmentPatchSchema.parse(body);
    const row = await this.commerce.patchFulfilment(id, dto);
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'commerce.fulfilment.update',
      entity: 'FulfilmentMethodConfig',
      entityId: id,
      meta: dto,
    });
    return row;
  }

  @Patch('commerce/counties/:id')
  @RequirePermissions('commerce.settings')
  async patchCounty(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = countyPatchSchema.parse(body);
    const row = await this.commerce.patchCounty(id, dto);
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'commerce.county.update',
      entity: 'DeliveryCounty',
      entityId: id,
      meta: dto,
    });
    return row;
  }

  @Patch('commerce/payments/:id')
  @RequirePermissions('commerce.settings')
  async patchPayment(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = paymentPatchSchema.parse(body);
    const row = await this.commerce.patchPayment(id, dto);
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'commerce.payment.update',
      entity: 'PaymentMethodConfig',
      entityId: id,
      meta: dto,
    });
    return row;
  }
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
