import { Injectable } from '@nestjs/common';
import { SalesChannel, WhatsappSessionState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';

interface WaMessage {
  from: string;
  text?: string;
  buttonId?: string;
}

@Injectable()
export class WhatsappService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly carts: CartService,
    private readonly orders: OrdersService,
    private readonly payments: PaymentsService,
  ) {}

  verify(mode: string, token: string, challenge: string) {
    if (mode === 'subscribe' && token === (process.env.WHATSAPP_VERIFY_TOKEN ?? 'change-me')) {
      return challenge;
    }
    return null;
  }

  async inbound(payload: { entry?: { changes?: { value?: { messages?: WaMessage[] } }[] }[] }) {
    const messages =
      payload.entry?.flatMap((e) => e.changes?.flatMap((c) => c.value?.messages ?? []) ?? []) ?? [];
    const replies: { to: string; body: string }[] = [];
    for (const msg of messages) {
      if (!msg.from) continue;
      replies.push(await this.handle(msg));
    }
    return { replies };
  }

  async handle(msg: WaMessage) {
    const session = await this.prisma.whatsappSession.upsert({
      where: { waId: msg.from },
      create: { waId: msg.from, state: WhatsappSessionState.WELCOME },
      update: { lastMessage: msg.text ?? msg.buttonId },
    });
    const text = (msg.buttonId ?? msg.text ?? '').trim().toLowerCase();

    if (!text || text === 'hi' || text === 'menu' || session.state === WhatsappSessionState.WELCOME) {
      await this.setState(session.id, WhatsappSessionState.BROWSE);
      return this.reply(session.id, msg.from, this.welcome());
    }

    if (text.startsWith('cat:')) {
      const slug = text.slice(4);
      const products = await this.prisma.product.findMany({
        where: { published: true, category: { slug } },
        take: 8,
      });
      await this.setState(session.id, WhatsappSessionState.BROWSE);
      const body =
        products.length === 0
          ? 'No pieces in that category yet. Reply MENU.'
          : products.map((p) => `• ${p.title}\n  Add: ADD:${p.slug}`).join('\n');
      return this.reply(session.id, msg.from, `Catalogue — ${slug}\n\n${body}`);
    }

    if (text.startsWith('add:')) {
      const slug = text.slice(4);
      const product = await this.prisma.product.findUnique({
        where: { slug },
        include: { variants: { include: { inventory: true } } },
      });
      const variant = product?.variants.find((v) =>
        v.inventory.some((i) => i.onHand - i.reserved > 0),
      );
      if (!product || !variant) {
        return this.reply(session.id, msg.from, 'That piece is out of stock. Reply MENU.');
      }
      const cart = await this.carts.getOrCreate({
        cartId: session.cartId ?? undefined,
        sessionKey: `wa:${msg.from}`,
        channel: SalesChannel.WHATSAPP,
      });
      const updated = await this.carts.add(cart.id, variant.id, 1, SalesChannel.WHATSAPP);
      await this.prisma.whatsappSession.update({
        where: { id: session.id },
        data: { cartId: updated.id, state: WhatsappSessionState.CART },
      });
      return this.reply(
        session.id,
        msg.from,
        `Added ${product.title} (${variant.size}/${variant.color}).\nCart total: €${(updated.subtotalCents / 100).toFixed(2)}\nReply CHECKOUT or MENU.`,
      );
    }

    if (text === 'cart') {
      const cart = session.cartId
        ? await this.carts.getOrCreate({ cartId: session.cartId, channel: SalesChannel.WHATSAPP })
        : null;
      if (!cart?.items.length) return this.reply(session.id, msg.from, 'Your cart is empty. Reply MENU.');
      const lines = cart.items.map((i) => `• ${i.title} × ${i.quantity}`).join('\n');
      return this.reply(session.id, msg.from, `${lines}\nTotal €${(cart.subtotalCents / 100).toFixed(2)}\nReply CHECKOUT`);
    }

    if (text === 'checkout') {
      if (!session.cartId) return this.reply(session.id, msg.from, 'Cart is empty. Reply MENU.');
      const cart = await this.carts.getOrCreate({ cartId: session.cartId });
      const user = await this.prisma.user.findUnique({ where: { phone: msg.from } });
      const order = await this.orders.checkout(
        {
          cartId: cart.id,
          fulfillment: 'COLLECTION',
          email: user?.email ?? `${msg.from}@whatsapp.motivefashion.ie`,
          name: user?.name ?? 'WhatsApp customer',
          phone: msg.from,
        },
        user?.id,
        SalesChannel.WHATSAPP,
      );
      const pay = await this.payments.createPaymentLink(order.id);
      await this.setState(session.id, WhatsappSessionState.AWAITING_PAYMENT);
      return this.reply(
        session.id,
        msg.from,
        `Order ${order.id.slice(0, 8)} reserved for 15 minutes.\nPay securely: ${pay.url}\nCollect in Dublin after payment.`,
      );
    }

    return this.reply(session.id, msg.from, this.welcome());
  }

  async sendTemplate(to: string, template: string, body: string) {
    const session = await this.prisma.whatsappSession.upsert({
      where: { waId: to },
      create: { waId: to },
      update: {},
    });
    await this.prisma.outboundMessage.create({ data: { sessionId: session.id, template, body } });
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      await fetch(
        `https://graph.facebook.com/v21.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to,
            type: 'text',
            text: { body },
          }),
        },
      );
    }
    return { queued: true };
  }

  async broadcast(body: string, template: string) {
    const opted = await this.prisma.user.findMany({
      where: { whatsappOptIn: true, phone: { not: null }, deletedAt: null },
    });
    for (const user of opted) {
      if (user.phone) await this.sendTemplate(user.phone, template, body);
    }
    return { sent: opted.length };
  }

  private welcome() {
    return [
      'Welcome to Motive Fashion, Dublin.',
      'Reply:',
      'CAT:hijabs  CAT:abayas  CAT:dresses  CAT:jilbabs  CAT:niqabs',
      'CART  CHECKOUT  MENU',
    ].join('\n');
  }

  private async setState(id: string, state: WhatsappSessionState) {
    await this.prisma.whatsappSession.update({ where: { id }, data: { state } });
  }

  private async reply(sessionId: string, to: string, body: string) {
    await this.prisma.outboundMessage.create({ data: { sessionId, body } });
    return { to, body };
  }
}
