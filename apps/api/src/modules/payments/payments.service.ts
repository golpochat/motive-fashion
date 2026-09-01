import { Injectable } from '@nestjs/common';
import Stripe from 'stripe';
import { PrismaService } from '../../prisma/prisma.service';
import { OrdersService } from '../orders/orders.service';

@Injectable()
export class PaymentsService {
  private stripe: Stripe | null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly orders: OrdersService,
  ) {
    this.stripe = process.env.STRIPE_SECRET_KEY
      ? new Stripe(process.env.STRIPE_SECRET_KEY)
      : null;
  }

  async createCheckoutSession(orderId: string) {
    const order = await this.prisma.order.findUniqueOrThrow({
      where: { id: orderId },
      include: { items: true },
    });
    const success = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/order/${order.id}?token=${order.trackingToken}`;
    const cancel = `${process.env.WEB_ORIGIN ?? 'http://localhost:3000'}/checkout?cancelled=1`;

    if (!this.stripe) {
      const paid = await this.orders.confirmPaid(order.id, `dev_${order.id}`, `dev_${order.id}`);
      return { url: success, mock: true, orderId: paid.id };
    }

    const session = await this.stripe.checkout.sessions.create({
      mode: 'payment',
      success_url: success,
      cancel_url: cancel,
      customer_email: order.email,
      metadata: { orderId: order.id },
      line_items: order.items.map((item) => ({
        quantity: item.quantity,
        price_data: {
          currency: 'eur',
          unit_amount: item.unitPriceCents,
          product_data: { name: `${item.title} (${item.size} / ${item.color})` },
        },
      })),
    });
    await this.prisma.order.update({
      where: { id: order.id },
      data: { stripeSessionId: session.id },
    });
    return { url: session.url, orderId: order.id };
  }

  async createPaymentLink(orderId: string) {
    const session = await this.createCheckoutSession(orderId);
    return session;
  }

  async handleStripeWebhook(rawBody: Buffer, signature: string | undefined) {
    if (!this.stripe || !process.env.STRIPE_WEBHOOK_SECRET) {
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
