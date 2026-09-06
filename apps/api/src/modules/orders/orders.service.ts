import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
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
import { splitVatInclusive } from '@motive-fashion/utils';
import type { CheckoutInput } from '@motive-fashion/validation';
import { configuredStripeSecret } from '../../common/security-config';
import { addressLabelCode, canTransitionOrder, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { CommerceService } from '../commerce/commerce.service';

const receiptInclude = {
  items: true,
  address: true,
  promo: { select: { code: true } },
} as const;

@Injectable()
export class OrdersService {
  private readonly log = new Logger(OrdersService.name);

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stock: StockService,
    @Inject(MailService) private readonly mail: MailService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
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
    if (channel === SalesChannel.WEB && input.returnPolicyAck !== true) {
      throw new BadRequestException('Please confirm the returns policy before paying');
    }

    await this.commerce.assertFulfilment(input.fulfillment, channel);
    const paymentMethod = await this.commerce.assertPublicPayment(input.paymentMethod, channel);

    let addressId: string | undefined;
    let county: string | undefined;
    if (input.fulfillment === 'DELIVERY') {
      const resolved = await this.resolveDeliveryAddress(input, userId);
      addressId = resolved.addressId;
      county = resolved.county;
    }

    const subtotal = cart.items.reduce((s, i) => s + i.variant.priceCents * i.quantity, 0);
    const priced = await this.commerce.price(
      { id: cart.id, subtotalCents: subtotal },
      input.fulfillment,
      county,
      input.promoCode,
    );
    if (priced.needsCounty) {
      throw new BadRequestException('County is required for Ireland delivery');
    }

    return this.prisma.order.create({
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
        promoCodeId: priced.promoCodeId,
        paymentMethod,
        shippingCounty: priced.shippingCounty,
        returnPolicyAck: input.returnPolicyAck === true,
        subtotalCents: priced.subtotalCents,
        discountCents: priced.discountCents,
        shippingCents: priced.shippingCents,
        taxCents: priced.taxCents,
        totalCents: priced.totalCents,
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
  }

  private async resolveDeliveryAddress(input: CheckoutInput, userId?: string) {
    if (input.addressId) {
      if (!userId) throw new BadRequestException('Sign in to use a saved address');
      const addr = await this.prisma.address.findFirst({ where: { id: input.addressId, userId } });
      if (!addr) throw new BadRequestException('Saved address not found');
      if (!isValidEircode(addr.eircode ?? '')) {
        throw new BadRequestException('This address needs a valid Eircode. Update it under Addresses.');
      }
      const county = (addr.county ?? input.county)?.trim().toUpperCase();
      if (!county) throw new BadRequestException('County is required for Ireland delivery');
      await this.commerce.publishedCounty(county);
      return { addressId: addr.id, county };
    }
    if (!input.address) {
      throw new BadRequestException('Delivery address required');
    }
    const county = input.address.county.trim().toUpperCase();
    await this.commerce.publishedCounty(county);
    const existing = userId ? await this.prisma.address.count({ where: { userId } }) : 0;
    const addr = await this.prisma.address.create({
      data: {
        userId,
        label: addressLabelCode(input.address.label),
        line1: input.address.line1,
        line2: input.address.line2,
        city: input.address.city,
        county,
        eircode: normalizeEircode(input.address.eircode),
        country: 'IE',
        isDefault: Boolean(userId) && existing === 0,
      },
    });
    return { addressId: addr.id, county };
  }


  async confirmPaid(orderId: string, providerRef: string, idempotencyKey: string) {
    let notify = false;
    try {
      const paid = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.payment.findUnique({ where: { idempotencyKey } });
        if (existing) {
          return tx.order.findUniqueOrThrow({ where: { id: existing.orderId }, include: receiptInclude });
        }
        const order = await tx.order.findUnique({
          where: { id: orderId },
          include: { items: true, cart: { include: { items: true } } },
        });
        if (!order) throw new NotFoundException();
        if (order.status !== OrderStatus.PENDING_PAYMENT) {
          return tx.order.findUniqueOrThrow({ where: { id: order.id }, include: receiptInclude });
        }

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
        if (order.cartId) {
          await tx.cartItem.deleteMany({ where: { cartId: order.cartId } });
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
        if (order.promoCodeId) {
          await tx.promoCode.update({
            where: { id: order.promoCodeId },
            data: { usedCount: { increment: 1 } },
          });
        }
        notify = true;
        return tx.order.update({
          where: { id: order.id },
          data: { status: OrderStatus.CONFIRMED },
          include: receiptInclude,
        });
      });
      if (notify) {
        try {
          await this.mail.sendOrderPaid(paid);
        } catch (err) {
          this.log.error(`Order confirmation email failed for ${paid.id}: ${err instanceof Error ? err.message : err}`);
        }
      }
      return paid;
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
        const payment = await this.prisma.payment.findUnique({ where: { idempotencyKey } });
        if (payment) {
          return this.prisma.order.findUniqueOrThrow({
            where: { id: payment.orderId },
            include: receiptInclude,
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
      include: {
        items: true,
        shipments: true,
        address: true,
        promo: { select: { code: true } },
        payments: {
          where: { status: PaymentStatus.SUCCEEDED },
          select: { createdAt: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
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
      include: { items: true, shipments: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  async transition(
    orderId: string,
    status: OrderStatus,
    actorId?: string,
    extras?: { carrier?: string; trackingNo?: string },
  ) {
    const current = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!current) throw new NotFoundException();
    if (!canTransitionOrder(current.fulfillment, current.status, status)) {
      throw new BadRequestException('That status is not the next step for this order');
    }
    if (status === OrderStatus.SHIPPED && !extras?.trackingNo?.trim()) {
      throw new BadRequestException('Add a tracking number before marking shipped');
    }

    const now = new Date();
    const existing = await this.prisma.shipment.findFirst({ where: { orderId } });
    const shipmentData = {
      packedAt: status === OrderStatus.PACKING ? now : existing?.packedAt,
      shippedAt:
        status === OrderStatus.SHIPPED || status === OrderStatus.READY_FOR_COLLECTION
          ? now
          : existing?.shippedAt,
      deliveredAt:
        status === OrderStatus.DELIVERED || status === OrderStatus.COLLECTED ? now : existing?.deliveredAt,
      carrier: extras?.carrier ?? existing?.carrier,
      trackingNo: extras?.trackingNo?.trim() ?? existing?.trackingNo,
    };
    if (existing) {
      await this.prisma.shipment.update({ where: { id: existing.id }, data: shipmentData });
    } else {
      await this.prisma.shipment.create({ data: { orderId, ...shipmentData } });
    }

    const order = await this.prisma.order.update({
      where: { id: orderId },
      data: { status },
      include: { items: true, address: true, promo: { select: { code: true } }, shipments: true },
    });
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `order.${status.toLowerCase()}`,
        entity: 'Order',
        entityId: orderId,
      },
    });
    if (status === OrderStatus.SHIPPED || status === OrderStatus.READY_FOR_COLLECTION) {
      try {
        await this.mail.sendOrderStatus(order);
      } catch (err) {
        this.log.error(`Status email failed for ${order.id}: ${err instanceof Error ? err.message : err}`);
      }
    }
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
