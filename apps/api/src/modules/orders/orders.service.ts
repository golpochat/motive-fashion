import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  FulfillmentMethod,
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
  SalesChannel,
} from '@prisma/client';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { MailService } from '../../common/mail.service';
import { promoDiscountCents, splitVatInclusive } from '@motive-fashion/utils';
import type { CheckoutInput } from '@motive-fashion/validation';
import { configuredStripeSecret } from '../../common/security-config';

const DUBLIN_COLLECTION = 0;
const IE_SHIPPING_CENTS = 595;
const FREE_SHIP_OVER = 12000;

@Injectable()
export class OrdersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stock: StockService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async checkout(input: CheckoutInput, userId?: string, channel: SalesChannel = SalesChannel.WEB) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: input.cartId },
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');
    if (channel === SalesChannel.WEB) {
      const ownerOk = Boolean(userId && cart.userId === userId);
      const sessionOk = Boolean(input.sessionKey && cart.sessionKey && input.sessionKey === cart.sessionKey);
      if (!ownerOk && !sessionOk) throw new ForbiddenException('Cart does not belong to this session');
    }
    if (input.fulfillment === 'DELIVERY' && !input.address) {
      throw new BadRequestException('Delivery address required');
    }

    let addressId: string | undefined;
    if (input.fulfillment === 'DELIVERY' && input.address) {
      const addr = await this.prisma.address.create({
        data: { ...input.address, userId, country: input.address.country ?? 'IE' },
      });
      addressId = addr.id;
    }

    const subtotal = cart.items.reduce((s, i) => s + i.variant.priceCents * i.quantity, 0);
    let discount = 0;
    let promoId: string | undefined;
    if (input.promoCode) {
      const promo = await this.prisma.promoCode.findUnique({ where: { code: input.promoCode.toUpperCase() } });
      const now = new Date();
      const valid =
        promo?.active &&
        (!promo.startsAt || promo.startsAt <= now) &&
        (!promo.endsAt || promo.endsAt >= now) &&
        (promo.maxUses == null || promo.usedCount < promo.maxUses);
      if (valid && promo) {
        discount = promoDiscountCents(subtotal, promo.type, promo.value);
        promoId = promo.id;
      }
    }
    const shipping =
      input.fulfillment === 'COLLECTION' || subtotal - discount >= FREE_SHIP_OVER
        ? DUBLIN_COLLECTION
        : IE_SHIPPING_CENTS;
    const taxable = Math.max(0, subtotal - discount) + shipping;
    const { taxCents } = splitVatInclusive(taxable);
    const total = taxable;

    const order = await this.prisma.order.create({
      data: {
        userId,
        cartId: cart.id,
        email: input.email,
        name: input.name,
        phone: input.phone,
        channel,
        fulfillment: input.fulfillment as FulfillmentMethod,
        addressId,
        giftNote: input.giftNote,
        promoCodeId: promoId,
        subtotalCents: subtotal,
        discountCents: discount,
        shippingCents: shipping,
        taxCents,
        totalCents: total,
        trackingToken: randomBytes(12).toString('hex'),
        items: {
          create: cart.items.map((i) => {
            const line = i.variant.priceCents * i.quantity;
            return {
              variantId: i.variantId,
              title: i.variant.product.title,
              sku: i.variant.sku,
              size: i.variant.size,
              color: i.variant.color,
              quantity: i.quantity,
              unitPriceCents: i.variant.priceCents,
              taxCents: splitVatInclusive(line).taxCents,
            };
          }),
        },
      },
      include: { items: true },
    });
    if (promoId) {
      await this.prisma.promoCode.update({
        where: { id: promoId },
        data: { usedCount: { increment: 1 } },
      });
    }
    return order;
  }

  async confirmPaid(orderId: string, providerRef: string, idempotencyKey: string) {
    const already = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
    try {
      const paid = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
        if (existing) {
          return tx.order.findUniqueOrThrow({ where: { id: existing.orderId }, include: { items: true } });
        }
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true, cart: { include: { items: true } } },
        });
        if (!order) throw new NotFoundException();
        if (order.status !== OrderStatus.PENDING_PAYMENT) return order;

        for (const item of order.items) {
          await this.stock.commit(
            {
              variantId: item.variantId,
              quantity: item.quantity,
              channel: order.channel,
              refId: order.id,
            },
            tx,
          );
        }
        if (order.cart) {
          await tx.cartItem.updateMany({
            where: { cartId: order.cart.id },
            data: { reserved: false },
          });
        }
        await tx.payment.create({
          data: {
            orderId: order.id,
            provider: 'stripe',
            providerRef,
            status: PaymentStatus.SUCCEEDED,
            amountCents: order.totalCents,
            idempotencyKey,
          },
        });
        return tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
          include: { items: true },
        });
      });
      if (!already) void this.mail.sendOrderPaid(paid);
      return paid;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const payment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (payment) {
          return this.prisma.order.findUniqueOrThrow({
            where: { id: payment.orderId },
            include: { items: true },
          });
        }
      }
      throw err;
    }
  }

  async track(id: string, token?: string) {
    if (!token) throw new UnauthorizedException('Tracking token required');
    const order = await this.prisma.order.findFirst({
      where: { id, trackingToken: token },
      include: { items: true, shipments: true },
    });
    if (!order) throw new NotFoundException();
    const { trackingToken: _, ...safe } = order;
    return safe;
  }

  async listMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(status?: OrderStatus) {
    return this.prisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async transition(orderId: string, status: OrderStatus, actorId?: string) {
    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
    });
    if (status === OrderStatus.PACKING || status === OrderStatus.SHIPPED) {
      const existing = await this.prisma.shipment.findFirst({ where: { orderId } });
      if (existing) {
        await this.prisma.shipment.update({
          where: { id: existing.id },
          data: {
            packedAt: status === OrderStatus.PACKING ? new Date() : existing.packedAt,
            shippedAt: status === OrderStatus.SHIPPED ? new Date() : existing.shippedAt,
          },
        });
      } else {
        await this.prisma.shipment.create({
          data: {
            orderId,
            packedAt: new Date(),
            shippedAt: status === OrderStatus.SHIPPED ? new Date() : undefined,
          },
        });
      }
    }
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `order.${status.toLowerCase()}`,
        entity: 'Order',
        entityId: orderId,
      },
    });
    return order;
  }

  async requestReturn(
    userId: string | undefined,
    dto: { orderId: string; reason: string; items: { orderItemId: string; quantity: number }[]; trackingToken?: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId }, include: { items: true } });
    if (!order) throw new NotFoundException();
    const owner = Boolean(userId && order.userId === userId);
    const tokenOk = Boolean(dto.trackingToken && dto.trackingToken === order.trackingToken);
    if (!owner && !tokenOk) throw new ForbiddenException('Not allowed to return this order');
    const eligible: OrderStatus[] = [OrderStatus.DELIVERED, OrderStatus.COLLECTED];
    if (!eligible.includes(order.status)) throw new BadRequestException('Order not eligible for return');
    return this.prisma.return.create({
      data: {
        orderId: order.id,
        userId,
        reason: dto.reason,
        items: { create: dto.items },
      },
      include: { items: true },
    });
  }

  async resolveReturn(returnId: string, status: ReturnStatus, actorId?: string) {
    const ret = await this.prisma.return.update({
      where: { id: returnId },
      data: { status },
      include: { items: { include: { orderItem: true } }, order: true },
    });
    if (status === ReturnStatus.RECEIVED || status === ReturnStatus.REFUNDED) {
      for (const item of ret.items) {
        await this.stock.receive({
          variantId: item.orderItem.variantId,
          quantity: item.quantity,
          refId: ret.id,
          note: `Return ${ret.id}`,
        });
      }
    }
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `return.${status.toLowerCase()}`,
        entity: 'Return',
        entityId: returnId,
      },
    });
    return ret;
  }

  async refund(orderId: string, amountCents: number, reason: string, actorId?: string) {
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId } });
    const key = configuredStripeSecret();
    if (key && order.stripeSessionId) {
      const stripe = new Stripe(key);
      const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      const intent = session.payment_intent;
      if (typeof intent === 'string') {
        await stripe.refunds.create({ payment_intent: intent, amount: amountCents });
      } else if (intent?.id) {
        await stripe.refunds.create({ payment_intent: intent.id, amount: amountCents });
      }
    }
    await this.prisma.payment.updateMany({
      where: { orderId, status: PaymentStatus.SUCCEEDED },
      data: {
        status: amountCents >= order.totalCents ? PaymentStatus.REFUNDED : PaymentStatus.PARTIALLY_REFUNDED,
      },
    });
    await this.prisma.refund.create({ data: { orderId, amountCents, reason } });
    const nextStatus =
      amountCents >= order.totalCents ? OrderStatus.REFUNDED : order.status;
    await this.prisma.auditLog.create({
      data: { actorId, action: 'order.refund', entity: 'Order', entityId: orderId, meta: { amountCents } },
    });
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
    });
  }
}
