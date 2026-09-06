import { ForbiddenException, Inject, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';
import { configuredStripeSecret, mockPaymentsAllowed } from '../../common/security-config';
import { OrderStatus } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null;

  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(OrdersService) private readonly orders: OrdersService,
  ) {
    const key = configuredStripeSecret();
    this.stripe = key ? new Stripe(key) : null;
  }

  async createCheckoutSession(orderId: string, proof?: { token?: string; userId?: string }) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException();
    this.assertPayAccess(order, proof);
    return this.startSession(order);
  }

  async createPaymentLink(orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) throw new NotFoundException();
    return this.startSession(order);
  }

  private assertPayAccess(
    order: { trackingToken: string; userId: string | null },
    proof?: { token?: string; userId?: string },
  ) {
    if (proof?.token && proof.token === order.trackingToken) return;
    if (proof?.userId && order.userId && proof.userId === order.userId) return;
    throw new ForbiddenException('Order pay proof required');
  }

  private async startSession(order: {
    id: string;
    email: string;
    trackingToken: string;
    shippingCents: number;
    discountCents: number;
    totalCents: number;
    items: { title: string; size: string; color: string; quantity: number; unitPriceCents: number }[];
  }) {
    const success = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/order/${order.id}?token=${order.trackingToken}`;
    const cancel = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/checkout?cancelled=1`;

    if (!this.stripe) {
      if (!mockPaymentsAllowed()) {
        throw new ServiceUnavailableException('Payments are not configured');
      }
      const paid = await this.orders.confirmPaid(order.id, `dev_${order.id}`, `dev_${order.id}`);
      return { url: success, mock: true, orderId: paid.id };
    }

    const lineItems: Stripe.Checkout.SessionCreateParams.LineItem[] = order.items.map((item) => ({
      quantity: item.quantity,
      price_data: {
        currency: 'eur',
        unit_amount: item.unitPriceCents,
        product_data: { name: `${item.title} (${item.size} / ${item.color})` },
      },
    }));
    if (order.shippingCents > 0) {
      lineItems.push({
        quantity: 1,
        price_data: {
          currency: 'eur',
          unit_amount: order.shippingCents,
          product_data: { name: 'Ireland delivery' },
        },
      });
    }

    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: 'payment',
      success_url: success,
      cancel_url: cancel,
      customer_email: order.email,
      metadata: { orderId: order.id },
      line_items: lineItems,
    };
    if (order.discountCents > 0) {
      const coupon = await this.stripe.coupons.create({
        amount_off: order.discountCents,
        currency: 'eur',
        duration: 'once',
        name: 'Order discount',
      });
      sessionParams.discounts = [{ coupon: coupon.id }];
    }

    const session = await this.stripe.checkout.sessions.create(sessionParams);
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    return { url: session.url, orderId: order.id };
  }

  /** Stripe success_url often lands before the webhook. Confirm from the Checkout Session. */
  async syncPaid(orderId: string, proof?: { token?: string; userId?: string }) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) throw new NotFoundException();
    this.assertPayAccess(order, proof);
    if (order.status !== OrderStatus.PENDING_PAYMENT) {
      return this.orders.track(orderId, order.trackingToken);
    }
    if (this.stripe && order.stripeSessionId) {
      try {
        const session = await this.stripe.checkout.sessions.retrieve(order.stripeSessionId);
        const paid = session.payment_status === 'paid' || session.status === 'complete';
        if (paid) {
          await this.orders.confirmPaid(order.id, session.id, `stripe-sync:${session.id}`);
        }
      } catch {
        /* webhook may still confirm; success page will poll */
      }
    }
    return this.orders.track(orderId, order.trackingToken);
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
      if (process.env.NODE_ENV === 'production') {
        throw new ServiceUnavailableException('Stripe webhook is not configured');
      }
      return { ignored: true };
    }
    const event = this.stripe.webhooks.constructEvent(
      rawBody,
      signature ?? '',
      process.env.STRIPE_WEBHOOK_SECRET,
    );
    const seen = await this.prisma.webhookEvent.findUnique({
      where: { provider_eventId: { provider: 'stripe', eventId: event.id } },
    });
    if (seen?.processed) return { duplicate: true };
    await this.prisma.webhookEvent.upsert({
      where: { provider_eventId: { provider: 'stripe', eventId: event.id } },
      create: { provider: 'stripe', eventId: event.id, payload: event as object, processed: false },
      update: {},
    });
    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;
      if (orderId) {
        await this.orders.confirmPaid(orderId, session.id, event.id);
      }
    }
    await this.prisma.webhookEvent.update({
      where: { provider_eventId: { provider: 'stripe', eventId: event.id } },
      data: { processed: true },
    });
    return { ok: true };
  }
}
