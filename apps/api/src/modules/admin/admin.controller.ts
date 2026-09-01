import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { OrderStatus, ReturnStatus, UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { productCreateSchema } from '@motive-fashion/validation';
import { slugify } from '@motive-fashion/utils';

@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class AdminController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {}

  @Get('analytics')
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
  products() {
    return this.prisma.product.findMany({
      include: { category: true, variants: true, images: true },
      orderBy: { title: 'asc' },
    });
  }

  @Post('products')
  createProduct(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = productCreateSchema.parse(body);
    return this.prisma.product.create({
      data: { ...dto, slug: dto.slug || slugify(dto.title) },
    }).then(async (product) => {
      await this.prisma.auditLog.create({
        data: { actorId: user.sub, action: 'product.create', entity: 'Product', entityId: product.id },
      });
      return product;
    });
  }

  @Patch('products/:id')
  updateProduct(@Param('id') id: string, @Body() body: Record<string, unknown>) {
    return this.prisma.product.update({ where: { id }, data: body });
  }

  @Post('products/:id/variants')
  addVariant(
    @Param('id') productId: string,
    @Body()
    body: {
      sku: string;
      size: string;
      color: string;
      costCents: number;
      priceCents: number;
    },
  ) {
    return this.prisma.productVariant.create({ data: { ...body, productId } });
  }

  @Get('inventory')
  inventory() {
    return this.prisma.inventoryLevel.findMany({
      include: { variant: { include: { product: true } }, location: true },
    });
  }

  @Get('orders')
  orderList(@Query('status') status?: OrderStatus) {
    return this.orders.listAdmin(status);
  }

  @Post('orders/:id/status')
  setStatus(
    @Param('id') id: string,
    @Body() body: { status: OrderStatus },
    @CurrentUser() user: { sub: string },
  ) {
    return this.orders.transition(id, body.status, user.sub);
  }

  @Post('orders/:id/refund')
  refund(
    @Param('id') id: string,
    @Body() body: { amountCents: number; reason: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.orders.refund(id, body.amountCents, body.reason, user.sub);
  }

  @Get('customers')
  customers() {
    return this.prisma.user.findMany({
      where: { role: UserRole.CUSTOMER, deletedAt: null },
      take: 200,
      orderBy: { createdAt: 'desc' },
    });
  }

  @Get('locations')
  locations() {
    return this.prisma.location.findMany();
  }

  @Get('returns')
  returns() {
    return this.prisma.return.findMany({ include: { items: true, order: true }, orderBy: { createdAt: 'desc' } });
  }

  @Post('returns/:id')
  resolveReturn(
    @Param('id') id: string,
    @Body() body: { status: ReturnStatus },
    @CurrentUser() user: { sub: string },
  ) {
    return this.orders.resolveReturn(id, body.status, user.sub);
  }

  @Get('promo-codes')
  promos() {
    return this.prisma.promoCode.findMany();
  }

  @Post('promo-codes')
  createPromo(
    @Body() body: { code: string; type: 'PERCENT' | 'FIXED'; value: number },
  ) {
    return this.prisma.promoCode.create({
      data: { code: body.code.toUpperCase(), type: body.type, value: body.value },
    });
  }
}
