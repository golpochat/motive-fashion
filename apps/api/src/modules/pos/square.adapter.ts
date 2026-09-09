import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { OrdersService } from '../orders/orders.service';
import { CommerceService } from '../commerce/commerce.service';
import { PaymentsService } from '../payments/payments.service';
import type { PosAdapter, PosSaleInput } from './pos-adapter';
import { buildEscPosReceipt, tillTicketNo } from './escpos-receipt';
import { ThermalPrinterService } from './thermal-printer';
import { MailService } from '../../common/mail.service';
import { writeAudit } from '../../common/audit';

const TILL_EMAIL = 'pos@motivefashion.ie';

@Injectable()
export class SquarePosAdapter implements PosAdapter {
  name = 'square';

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stock: StockService,
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(ThermalPrinterService) private readonly printer: ThermalPrinterService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async quote(input: {
    lines: { sku: string; quantity: number }[];
    fulfillment: 'DELIVERY' | 'COLLECTION';
    county?: string;
    promoCode?: string;
  }) {
    const variants = await this.prisma.productVariant.findMany({
      where: { sku: { in: input.lines.map((l) => l.sku) } },
    });
    const subtotal = input.lines.reduce((sum, line) => {
      const variant = variants.find((v) => v.sku === line.sku);
      if (!variant) throw new BadRequestException(`Unknown SKU ${line.sku}`);
      return sum + variant.priceCents * line.quantity;
    }, 0);
    return this.commerce.price({ id: 'pos-till', subtotalCents: subtotal }, input.fulfillment, input.county, input.promoCode);
  }

  async onSale(input: PosSaleInput, cashierId?: string) {
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
    const email = input.email?.trim() || TILL_EMAIL;
    const fulfillment = input.fulfillment ?? 'COLLECTION';
    const paymentMethod = input.paymentMethod ?? 'CASH';
    const order = await this.orders.checkout(
      {
        cartId: cart.id,
        fulfillment,
        email,
        name: input.name ?? 'Walk-in',
        phone: input.phone,
        paymentMethod,
        promoCode: input.promoCode,
        county: input.county,
        address:
          fulfillment === 'DELIVERY' && input.address
            ? {
                line1: input.address.line1,
                line2: input.address.line2,
                city: input.address.city,
                county: input.address.county,
                eircode: input.address.eircode,
                country: 'IE',
                label: input.address.label ?? 'HOME',
              }
            : undefined,
      },
      undefined,
      SalesChannel.POS,
    );
    if (paymentMethod === 'CASH') {
      await this.orders.confirmPaid(order.id, input.externalId, `pos:${input.externalId}`);
    }
    await this.prisma.posSale.create({
      data: {
        orderId: order.id,
        deviceId: input.deviceId,
        externalId: input.externalId,
        raw: { ...input, cashierId } as object,
      },
    });
    if (cashierId) {
      await writeAudit(this.prisma, {
        actorId: cashierId,
        action: 'pos.sale',
        entity: 'Order',
        entityId: order.id,
      });
    }
    if (paymentMethod === 'CARD') {
      const pay = await this.payments.createCheckoutSession(order.id, { token: order.trackingToken });
      return { orderId: order.id, trackingToken: order.trackingToken, paymentMethod, payUrl: pay.url, mock: pay.mock };
    }
    return { orderId: order.id, trackingToken: order.trackingToken, paymentMethod };
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

  async printReceipt(orderId: string, cash?: { tenderedCents?: number; changeCents?: number }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new BadRequestException('Order not found');
    const ticket = buildEscPosReceipt({
      id: order.id,
      name: order.name,
      email: order.email,
      createdAt: order.createdAt,
      fulfillment: order.fulfillment,
      shippingCounty: order.shippingCounty,
      paymentMethod: order.paymentMethod,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      trackingToken: order.trackingToken,
      vatNumber: process.env.VAT_NUMBER,
      items: order.items,
      tenderedCents: cash?.tenderedCents,
      changeCents: cash?.changeCents,
    });
    const sent = await this.printer.send(ticket.payload);
    return { printed: sent.printed, preview: ticket.preview, error: sent.error };
  }

  async listTillOrders(cashierId: string) {
    const sales = await this.prisma.posSale.findMany({
      include: { order: { include: { items: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return sales.filter((sale) => this.cashierOwns(sale.raw, cashierId)).map((sale) => this.serializeTillOrder(sale.order));
  }

  async getTillOrder(orderId: string, cashierId: string) {
    const sale = await this.ownedSale(orderId, cashierId);
    return this.serializeTillOrder(sale.order);
  }

  async printTillOrder(orderId: string, cashierId: string) {
    await this.ownedSale(orderId, cashierId);
    return this.printReceipt(orderId);
  }

  async emailTillOrder(orderId: string, cashierId: string, email?: string) {
    const sale = await this.ownedSale(orderId, cashierId);
    const to = email?.trim() || (this.realEmail(sale.order.email) ? sale.order.email : '');
    if (!to) throw new BadRequestException('Add a customer email to send this receipt');
    const result = await this.mail.sendOrderPaid(
      {
        ...sale.order,
        email: to,
      },
      { to },
    );
    if (result && 'ok' in result && result.ok === false) {
      throw new BadRequestException('Receipt email could not be sent');
    }
    if (result && 'skipped' in result && result.skipped) {
      return { sent: false, skipped: true, email: to };
    }
    return { sent: true, email: to };
  }

  private realEmail(email: string) {
    return Boolean(email) && email !== TILL_EMAIL && !email.toLowerCase().includes('@pos.motivefashion.ie');
  }

  private async ownedSale(orderId: string, cashierId: string) {
    const sale = await this.prisma.posSale.findUnique({
      where: { orderId },
      include: {
        order: { include: { items: true, address: true, promo: { select: { code: true } }, shipments: true } },
      },
    });
    if (!sale) throw new NotFoundException('Sale not found');
    if (!this.cashierOwns(sale.raw, cashierId)) throw new ForbiddenException();
    return sale;
  }

  private cashierOwns(raw: unknown, cashierId: string) {
    const tagged = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as { cashierId?: string }).cashierId : undefined;
    return !tagged || tagged === cashierId;
  }

  private serializeTillOrder(order: {
    id: string;
    createdAt: Date;
    name: string;
    email: string;
    phone: string | null;
    status: string;
    channel: string;
    fulfillment: string;
    paymentMethod: string;
    shippingCounty: string | null;
    subtotalCents: number;
    discountCents: number;
    shippingCents: number;
    taxCents: number;
    totalCents: number;
    items: {
      title: string;
      sku: string;
      size: string;
      color: string;
      quantity: number;
      unitPriceCents: number;
    }[];
  }) {
    return {
      id: order.id,
      ticket: tillTicketNo(order.id),
      createdAt: order.createdAt,
      name: order.name,
      email: this.realEmail(order.email) ? order.email : null,
      phone: order.phone,
      status: order.status,
      channel: order.channel,
      fulfillment: order.fulfillment,
      paymentMethod: order.paymentMethod,
      shippingCounty: order.shippingCounty,
      subtotalCents: order.subtotalCents,
      discountCents: order.discountCents,
      shippingCents: order.shippingCents,
      taxCents: order.taxCents,
      totalCents: order.totalCents,
      items: order.items,
    };
  }
}
