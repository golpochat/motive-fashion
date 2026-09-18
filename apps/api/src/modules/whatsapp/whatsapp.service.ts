import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SalesChannel, WhatsappSessionState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { isProduction } from '../../common/security-config';
import { metaSignatureValid } from '../../common/webhook-signature';
import { decodeWhatsappPicks, encodeWhatsappPicks, whatsappIntent } from '@motive-fashion/utils';

interface WaMessage {
  from: string;
  text?: string;
  buttonId?: string;
}

@Injectable()
export class WhatsappService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(CartService) private readonly carts: CartService,
    @Inject(OrdersService) private readonly orders: OrdersService,
    @Inject(PaymentsService) private readonly payments: PaymentsService,
  ) {}

  verify(mode: string, token: string, challenge: string) {
    const expected = process.env.WHATSAPP_VERIFY_TOKEN;
    if (!expected || expected === 'change-me') {
      throw new ForbiddenException('WhatsApp verify token is not configured');
    }
    if (mode === 'subscribe' && token === expected) {
      return challenge;
    }
    throw new ForbiddenException();
  }

  assertInboundSignature(rawBody: Buffer, header: string | undefined) {
    const secret = process.env.WHATSAPP_APP_SECRET;
    if (!secret) {
      if (isProduction()) {
        throw new UnauthorizedException('WhatsApp app secret is not configured');
      }
      return;
    }
    if (!metaSignatureValid(rawBody, header, secret)) {
      throw new UnauthorizedException('Invalid WhatsApp signature');
    }
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
      update: {},
    });
    const raw = (msg.buttonId ?? msg.text ?? '').trim();
    const intent = whatsappIntent(raw);

    if (intent.type === 'menu') {
      await this.setState(session.id, WhatsappSessionState.BROWSE);
      return this.reply(session.id, msg.from, this.welcome());
    }

    if (intent.type === 'category') {
      return this.listCategory(session.id, msg.from, intent.slug);
    }

    if (intent.type === 'add') {
      return this.addSlug(session.id, session.cartId, msg.from, intent.slug);
    }

    if (intent.type === 'pick') {
      const slugs = decodeWhatsappPicks(session.lastMessage);
      const slug = slugs[intent.index];
      if (!slug) {
        return this.reply(session.id, msg.from, 'That number is not on the last list. Tell me a piece or reply MENU.');
      }
      return this.addSlug(session.id, session.cartId, msg.from, slug);
    }

    if (intent.type === 'cart') {
      const cart = session.cartId
        ? await this.carts.getOrCreate({ cartId: session.cartId, channel: SalesChannel.WHATSAPP, internal: true })
        : null;
      if (!cart?.items.length) return this.reply(session.id, msg.from, 'Your cart is empty. Tell me what you want, like “black hijab”.');
      const lines = cart.items.map((i) => `• ${i.title} × ${i.quantity}`).join('\n');
      return this.reply(session.id, msg.from, `${lines}\nTotal €${(cart.subtotalCents / 100).toFixed(2)}\nReply CHECKOUT to pay.`);
    }

    if (intent.type === 'checkout') {
      if (!session.cartId) return this.reply(session.id, msg.from, 'Your cart is empty. Tell me a piece first.');
      const cart = await this.carts.getOrCreate({ cartId: session.cartId, internal: true });
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

    return this.searchPieces(session.id, msg.from, intent.q);
  }

  private async listCategory(sessionId: string, to: string, slug: string) {
    const products = await this.prisma.product.findMany({
      where: { published: true, category: { slug } },
      take: 8,
      orderBy: { title: 'asc' },
    });
    await this.setState(sessionId, WhatsappSessionState.BROWSE);
    if (!products.length) {
      return this.reply(sessionId, to, `Nothing in ${slug} just now. Try “hijabs” or “abayas”.`);
    }
    await this.prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { lastMessage: encodeWhatsappPicks(products.map((row) => row.slug)) },
    });
    const body = products.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
    return this.reply(sessionId, to, `${slug.replace(/-/g, ' ')}\n\n${body}\n\nReply a number to add it, or describe a colour.`);
  }

  private async searchPieces(sessionId: string, to: string, q: string) {
    const products = await this.prisma.product.findMany({
      where: {
        published: true,
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { slug: { contains: q.replace(/\s+/g, '-'), mode: 'insensitive' } },
          { category: { name: { contains: q, mode: 'insensitive' } } },
          { variants: { some: { color: { contains: q, mode: 'insensitive' } } } },
        ],
      },
      take: 8,
      orderBy: { title: 'asc' },
    });
    if (!products.length) {
      return this.reply(sessionId, to, `I could not find “${q}”. Try “black hijab”, “jilbabs”, or MENU.`);
    }
    if (products.length === 1 && products[0]) {
      return this.addSlug(sessionId, undefined, to, products[0].slug);
    }
    await this.prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { lastMessage: encodeWhatsappPicks(products.map((row) => row.slug)) },
    });
    const body = products.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
    return this.reply(sessionId, to, `Here’s what I found:\n\n${body}\n\nReply a number to add it.`);
  }

  private async addSlug(sessionId: string, cartId: string | null | undefined, from: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        published: true,
        OR: [{ slug }, { slug: slug.replace(/\s+/g, '-') }, { title: { equals: slug, mode: 'insensitive' } }],
      },
      include: { variants: { include: { inventory: true } } },
    });
    const variant = product?.variants.find((v) => v.inventory.some((i) => i.onHand - i.reserved > 0));
    if (!product || !variant) {
      return this.reply(sessionId, from, 'That piece is out of stock. Try another colour or MENU.');
    }
    const session = await this.prisma.whatsappSession.findUnique({ where: { id: sessionId } });
    const cart = await this.carts.getOrCreate({
      cartId: cartId ?? session?.cartId ?? undefined,
      sessionKey: `wa:${from}`,
      channel: SalesChannel.WHATSAPP,
      internal: true,
    });
    const updated = await this.carts.add(cart.id, variant.id, 1, SalesChannel.WHATSAPP, { internal: true });
    await this.prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { cartId: updated.id, state: WhatsappSessionState.CART },
    });
    return this.reply(
      sessionId,
      from,
      `Added ${product.title} (${variant.size}/${variant.color}).\nCart €${(updated.subtotalCents / 100).toFixed(2)}\nReply CHECKOUT to pay, or keep shopping.`,
    );
  }

  async sendTemplate(to: string, template: string, body: string) {
    const session = await this.prisma.whatsappSession.upsert({
      where: { waId: to },
      create: { waId: to },
      update: {},
    });
    await this.prisma.outboundMessage.create({ data: { sessionId: session.id, template, body } });
    if (process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID) {
      await this.sendText(to, body);
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
      'Tell me what you want — “black hijab”, “jilbabs”, or “abaya”.',
      'Reply a number to add a piece, CART to see your bag, CHECKOUT to pay and collect.',
    ].join('\n');
  }

  private async setState(id: string, state: WhatsappSessionState) {
    await this.prisma.whatsappSession.update({ where: { id }, data: { state } });
  }

  private async sendText(to: string, body: string) {
    const token = process.env.WHATSAPP_ACCESS_TOKEN;
    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;
    if (!token || !phoneId) return;
    await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to,
        type: 'text',
        text: { body },
      }),
    });
  }

  private async reply(sessionId: string, to: string, body: string) {
    await this.prisma.outboundMessage.create({ data: { sessionId, body } });
    await this.sendText(to, body);
    return { to, body };
  }
}
