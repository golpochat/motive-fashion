import { BadRequestException, Body, Controller, Delete, Get, Inject, Param, Patch, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { OrderStatus, Prisma, ReviewStatus, UserRole } from '../../../generated/prisma';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { CommerceService } from '../commerce/commerce.service';
import {
  productCreateSchema,
  productPatchSchema,
  variantCreateSchema,
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
  reviewModerateSchema,
} from '@motive-fashion/validation';
import { slugify } from '@motive-fashion/utils';
import { customerPublicSelect } from '../../common/user-select';
import { writeAudit } from '../../common/audit';
import { saveProductImage, uploadDir } from '../../common/media';
import { unlinkSync, existsSync } from 'fs';
import { join } from 'path';

@Controller('admin')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class AdminController {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
  ) {}

  @Get('analytics')
  @RequirePermissions('analytics.read')
  async analytics() {
    const [orderAgg, orders, low] = await Promise.all([
      this.prisma.order.aggregate({
        _sum: { totalCents: true },
        _count: true,
        where: { status: { notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED] } },
      }),
      this.prisma.order.groupBy({
        by: ['channel'],
        _sum: { totalCents: true },
        _count: true,
      }),
      this.prisma.inventoryLevel.count({
        where: { onHand: { lte: 5 } },
      }),
    ]);
    const top = await this.prisma.orderItem.groupBy({
      by: ['sku', 'title'],
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 8,
    });
    return {
      revenueCents: orderAgg._sum.totalCents ?? 0,
      orderCount: orderAgg._count,
      stockouts: low,
      byChannel: orders,
      topSkus: top,
    };
  }

  @Get('products')
  @RequirePermissions('catalog.read')
  products() {
    return this.prisma.product.findMany({
      include: { category: true, variants: true, images: true },
      orderBy: { title: 'asc' },
    });
  }

  @Post('products')
  @RequirePermissions('catalog.write')
  createProduct(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = productCreateSchema.parse(body);
    return this.prisma.product.create({
      data: { ...dto, slug: dto.slug?.trim() || slugify(dto.title) },
    }).then(async (product) => {
      await writeAudit(this.prisma, {
        actorId: user.sub,
        action: 'product.create',
        entity: 'Product',
        entityId: product.id,
      });
      return product;
    });
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
    const dto = variantCreateSchema.parse(body);
    const variant = await this.prisma.productVariant.create({
      data: { ...dto, productId, barcode: dto.barcode?.trim() || dto.sku },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'product.variant.create',
      entity: 'ProductVariant',
      entityId: variant.id,
      meta: { productId, sku: dto.sku },
    });
    return variant;
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
  audit(@Query('entity') entity?: string, @Query('action') action?: string, @Query('cursor') cursor?: string) {
    return this.prisma.auditLog.findMany({
      where: {
        ...(entity ? { entity } : {}),
        ...(action ? { action: { contains: action, mode: 'insensitive' } } : {}),
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
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
