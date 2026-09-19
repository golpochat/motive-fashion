import { BadRequestException, ForbiddenException, Inject, Injectable, Logger, NotFoundException, UnauthorizedException } from '@nestjs/common';
import {
  FulfillmentMethod,
  OrderStatus,
  PaymentStatus,
  ReturnStatus,
  SalesChannel,
} from '@prisma/client';
import { randomBytes, randomUUID } from 'crypto';
import { Prisma, ReviewStatus } from '../../../generated/prisma';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { MailService } from '../../common/mail.service';
import { splitVatInclusive } from '@motive-fashion/utils';
import type { CheckoutInput } from '@motive-fashion/validation';
import { configuredStripeSecret, isProduction, mockPaymentsAllowed } from '../../common/security-config';
import { addressLabelCode, canTransitionOrder, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { CommerceService } from '../commerce/commerce.service';
import {
  isCashPayment,
  paymentStatusAfterRefund,
  refundableCents,
  shouldRestockOnRefund,
} from './refund-policy';
import { shouldKeepReviewAfterRefund } from '../customers/review-eligibility';

const receiptInclude = {
  items: true,
  address: true,
  promo: { select: { code: true } },
} as const;

function cashierIdFromRaw(raw: unknown) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const id = (raw as { cashierId?: unknown }).cashierId;
  return typeof id === 'string' && id ? id : undefined;
}

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
        returns: { include: { items: true } },
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

  async lookup(email: string, ticket: string) {
    const needle = ticket.trim();
    const compact = needle.replace(/-/g, '').toUpperCase();
    const candidates = await this.prisma.order.findMany({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
      select: { id: true, trackingToken: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    const order = candidates.find((row) => {
      const id = row.id.toLowerCase();
      const ref = row.id.replace(/-/g, '').slice(0, 8).toUpperCase();
      return (
        row.id === needle ||
        id === needle.toLowerCase() ||
        id.startsWith(needle.toLowerCase()) ||
        ref === compact ||
        ref.startsWith(compact)
      );
    });
    if (!order) throw new NotFoundException('No order matched that email and ticket.');
    return { id: order.id, trackingToken: order.trackingToken };
  }

  async listMine(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async listAdmin(status?: OrderStatus) {
    const orders = await this.prisma.order.findMany({
      where: status ? { status } : {},
      include: { items: true, shipments: true, posSale: true, refunds: true },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    const cashierIds = [
      ...new Set(orders.map((order) => cashierIdFromRaw(order.posSale?.raw)).filter((id): id is string => Boolean(id))),
    ];
    const cashiers = cashierIds.length
      ? await this.prisma.user.findMany({
          where: { id: { in: cashierIds } },
          select: { id: true, name: true, email: true },
        })
      : [];
    const byId = Object.fromEntries(cashiers.map((row) => [row.id, row]));
    return orders.map((order) => {
      const cashierId = cashierIdFromRaw(order.posSale?.raw);
      const cashier = cashierId ? byId[cashierId] : undefined;
      return {
        ...order,
        ticket: order.channel === SalesChannel.POS ? order.id.replace(/-/g, '').slice(0, 8).toUpperCase() : null,
        cashierId: cashierId ?? null,
        cashierName: cashier?.name ?? null,
        cashierEmail: cashier?.email ?? null,
        refundedCents: order.refunds.reduce((sum, row) => sum + row.amountCents, 0),
      };
    });
  }

  async packSheet(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            variant: { include: { inventory: { include: { location: true } } } },
          },
        },
      },
    });
    if (!order) throw new NotFoundException();
    const lines = order.items
      .map((item) => {
        const warehouse = item.variant.inventory.find((row) => row.location.code === 'warehouse');
        const withBin = item.variant.inventory.find((row) => row.binCode);
        return {
          sku: item.sku,
          barcode: item.variant.barcode,
          title: item.title,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          binCode: warehouse?.binCode ?? withBin?.binCode ?? null,
        };
      })
      .sort((a, b) => {
        if (a.binCode && b.binCode) return a.binCode.localeCompare(b.binCode) || a.sku.localeCompare(b.sku);
        if (a.binCode) return -1;
        if (b.binCode) return 1;
        return a.sku.localeCompare(b.sku);
      });
    return {
      id: order.id,
      status: order.status,
      fulfillment: order.fulfillment,
      name: order.name,
      email: order.email,
      ticket: order.id.replace(/-/g, '').slice(0, 8).toUpperCase(),
      lines,
    };
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
    const open = await this.prisma.return.findFirst({
      where: { orderId: order.id, status: { in: [ReturnStatus.REQUESTED, ReturnStatus.APPROVED, ReturnStatus.RECEIVED] } },
    });
    if (open) throw new BadRequestException('A return is already open on this order');
    const byId = new Map(order.items.map((item) => [item.id, item]));
    for (const line of dto.items) {
      const item = byId.get(line.orderItemId);
      if (!item) throw new BadRequestException('That line is not on this order');
      if (line.quantity > item.quantity) throw new BadRequestException('Return quantity is higher than the ordered quantity');
    }
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
    const previous = await this.prisma.return.findUnique({ where: { id: returnId } });
    if (!previous) throw new NotFoundException();
    const ret = await this.prisma.return.update({
      where: { id: returnId },
      data: { status },
      include: {
        items: { include: { orderItem: { include: { variant: { select: { productId: true } } } } } },
        order: true,
      },
    });
    const alreadyStocked = previous.status === ReturnStatus.RECEIVED || previous.status === ReturnStatus.REFUNDED;
    const shouldRestock = (status === ReturnStatus.RECEIVED || status === ReturnStatus.REFUNDED) && !alreadyStocked;
    if (shouldRestock) {
      for (const item of ret.items) {
        await this.stock.receive({
          variantId: item.orderItem.variantId,
          quantity: item.quantity,
          refId: ret.id,
          note: `Return ${ret.id}`,
        });
      }
    }
    if (status === ReturnStatus.REFUNDED) {
      const goodsCents = ret.items.reduce(
        (sum, item) => sum + item.orderItem.unitPriceCents * item.quantity,
        0,
      );
      const already = await this.prisma.refund.aggregate({
        where: { orderId: ret.orderId },
        _sum: { amountCents: true },
      });
      const cap = refundableCents(ret.order.totalCents, already._sum.amountCents ?? 0);
      const amount = Math.min(goodsCents, cap);
      if (amount > 0) {
        await this.refund(ret.orderId, amount, `Return ${ret.id}`, actorId, { restock: false });
      }
      const productIds = [
        ...new Set(ret.items.map((item) => item.orderItem.variant.productId)),
      ];
      await this.applyRefundReviewPolicy(ret.order.userId, productIds);
    }
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: `return.${status.toLowerCase()}`,
        entity: 'Return',
        entityId: returnId,
      },
    });
    return this.prisma.return.findUniqueOrThrow({
      where: { id: returnId },
      include: { items: { include: { orderItem: true } }, order: true },
    });
  }

  async listRefunds() {
    const rows = await this.prisma.refund.findMany({
      include: {
        order: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            channel: true,
            paymentMethod: true,
            totalCents: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((row) => ({
      ...row,
      method: isCashPayment(row.order.paymentMethod) ? 'CASH' : 'CARD',
    }));
  }

  async refund(
    orderId: string,
    amountCents: number,
    reason: string,
    actorId?: string,
    opts?: { restock?: boolean },
  ) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: { include: { variant: { select: { productId: true } } } }, refunds: true, payments: true },
    });
    if (order.status === OrderStatus.PENDING_PAYMENT) {
      throw new BadRequestException('This order has not been paid');
    }
    const already = order.refunds.reduce((sum, row) => sum + row.amountCents, 0);
    const remaining = refundableCents(order.totalCents, already);
    if (remaining < 1) throw new BadRequestException('This order is already refunded');
    if (amountCents > remaining) {
      throw new BadRequestException(`Refund cannot exceed ${remaining} cents remaining`);
    }

    const cash = isCashPayment(order.paymentMethod);
    const providerRef = cash
      ? `cash:${randomUUID()}`
      : await this.refundCard(order, amountCents, already);

    const refundedTotal = already + amountCents;
    const payStatus = paymentStatusAfterRefund(order.totalCents, refundedTotal);
    await this.prisma.payment.updateMany({
      where: {
        orderId,
        status: { in: [PaymentStatus.SUCCEEDED, PaymentStatus.PARTIALLY_REFUNDED] },
      },
      data: { status: payStatus },
    });
    await this.prisma.refund.create({ data: { orderId, amountCents, reason, providerRef } });

    const restock =
      opts?.restock === false
        ? false
        : refundedTotal >= order.totalCents && shouldRestockOnRefund(order.status, order.fulfillment);
    if (restock) {
      for (const item of order.items) {
        await this.stock.receive({
          variantId: item.variantId,
          quantity: item.quantity,
          refId: orderId,
          note: `Refund ${orderId}`,
        });
      }
    }

    const nextStatus = refundedTotal >= order.totalCents ? OrderStatus.REFUNDED : order.status;
    if (nextStatus === OrderStatus.REFUNDED) {
      await this.applyRefundReviewPolicy(
        order.userId,
        order.items.map((item) => item.variant.productId),
      );
    }
    await this.prisma.auditLog.create({
      data: {
        actorId,
        action: 'order.refund',
        entity: 'Order',
        entityId: orderId,
        meta: { amountCents, method: cash ? 'CASH' : 'CARD', providerRef, restock },
      },
    });
    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: nextStatus },
      include: { refunds: true, payments: true },
    });
  }

  private async refundCard(
    order: { id: string; stripeSessionId: string | null },
    amountCents: number,
    alreadyRefunded: number,
  ) {
    const key = configuredStripeSecret();
    if (!order.stripeSessionId) {
      if (isProduction() && key) {
        throw new BadRequestException('This card order has no Stripe session to refund');
      }
      return `mock:${randomUUID()}`;
    }
    if (!key) {
      if (mockPaymentsAllowed()) return `mock:${randomUUID()}`;
      throw new BadRequestException('Card refunds need Stripe');
    }
    const stripe = new Stripe(key);
    const session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
    const intent = session.payment_intent;
    const intentId = typeof intent === 'string' ? intent : intent?.id;
    if (!intentId) {
      throw new BadRequestException('Stripe has no payment intent for this order');
    }
    try {
      const refund = await stripe.refunds.create(
        { payment_intent: intentId, amount: amountCents, reason: 'requested_by_customer' },
        { idempotencyKey: `mf-refund-${order.id}-${alreadyRefunded}-${amountCents}` },
      );
      return refund.id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Stripe refund failed';
      throw new BadRequestException(message);
    }
  }

  private async applyRefundReviewPolicy(userId: string | null, productIds: string[]) {
    if (!userId) return;
    const ids = [...new Set(productIds.filter(Boolean))];
    if (!ids.length) return;
    const reviews = await this.prisma.review.findMany({
      where: { userId, productId: { in: ids } },
      select: { id: true, rating: true, status: true },
    });
    const drop = reviews.filter(
      (review) => !shouldKeepReviewAfterRefund(review.rating) && review.status !== ReviewStatus.REJECTED,
    );
    if (!drop.length) return;
    await this.prisma.review.updateMany({
      where: { id: { in: drop.map((row) => row.id) } },
      data: { status: ReviewStatus.REJECTED },
    });
  }
}
