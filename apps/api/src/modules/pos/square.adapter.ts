import { BadRequestException, Injectable } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { OrdersService } from '../orders/orders.service';
import type { PosAdapter, PosSaleInput } from './pos-adapter';

@Injectable()
export class SquarePosAdapter implements PosAdapter {
  name = 'square';

  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
    private readonly orders: OrdersService,
  ) {}

  async onSale(input: PosSaleInput) {
    const existing = await this.prisma.posSale.findUnique({ where: { externalId: input.externalId } });
    if (existing) return { orderId: existing.orderId };

    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { in: input.lines.map((l) => l.sku) } },
      include: { product: true },
    });
    const cart = await this.prisma.cart.create({
      data: { channel: SalesChannel.POS },
    });
    for (const line of input.lines) {
      const variant = variants.find((v) => v.sku === line.sku);
      if (!variant) throw new BadRequestException(`Unknown SKU ${line.sku}`);
      await this.stock.reserve({
        variantId: variant.id,
        quantity: line.quantity,
        channel: SalesChannel.POS,
        refId: cart.id,
        locationId: input.locationId,
      });
      await this.prisma.cartItem.create({
        data: { cartId: cart.id, variantId: variant.id, quantity: line.quantity, reserved: true },
      });
    }
    const order = await this.orders.checkout(
      {
        cartId: cart.id,
        fulfillment: 'COLLECTION',
        email: input.email ?? 'pos@motivefashion.ie',
        name: input.name ?? 'Walk-in',
        phone: input.phone,
      },
      undefined,
      SalesChannel.POS,
    );
    await this.orders.confirmPaid(order.id, input.externalId, `pos:${input.externalId}`);
    await this.prisma.posSale.create({
      data: {
        orderId: order.id,
        deviceId: input.deviceId,
        externalId: input.externalId,
        raw: input as object,
      },
    });
    return { orderId: order.id };
  }

  async onRefund(externalId: string, amountCents: number) {
    const sale = await this.prisma.posSale.findUnique({ where: { externalId } });
    if (!sale) return;
    await this.orders.refund(sale.orderId, amountCents, 'POS refund');
  }

  async pushInventorySnapshot() {
    /* Square catalog sync is vendor-specific; Motive DB remains source of truth. */
  }

  async upsertCustomer(phone: string, name: string, email?: string) {
    await this.prisma.user.upsert({
      where: { phone },
      create: { phone, name, email: email ?? `${phone.replace(/\D/g, '')}@pos.motivefashion.ie` },
      update: { name, email: email ?? undefined },
    });
  }

  async printReceipt(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    const preview = [
      'MOTIVE FASHION — DUBLIN',
      ...order.items.map((i) => `${i.title} ${i.size}/${i.color} x${i.quantity}`),
      `TOTAL €${(order.totalCents / 100).toFixed(2)}`,
      'VAT included',
    ].join('\n');
    return { printed: false, preview };
  }
}
