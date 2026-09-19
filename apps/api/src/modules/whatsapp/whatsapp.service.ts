import { ForbiddenException, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { SalesChannel, WhatsappSessionState } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CartService } from '../cart/cart.service';
import { OrdersService } from '../orders/orders.service';
import { PaymentsService } from '../payments/payments.service';
import { CommerceService } from '../commerce/commerce.service';
import { isProduction } from '../../common/security-config';
import { metaSignatureValid } from '../../common/webhook-signature';
import {
  availableStock,
  decodeWhatsappPicks,
  decodeWhatsappVariants,
  encodeWhatsappPicks,
  encodeWhatsappVariants,
  whatsappIntent,
} from '@motive-fashion/utils';
import { IE_COUNTIES, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';

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
    @Inject(CommerceService) private readonly commerce: CommerceService,
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
    const variantsWait = decodeWhatsappVariants(session.lastMessage);
    const waitingFulfilment = session.lastMessage === 'fulfill';
    const waitingDelivery = session.lastMessage === 'deliver';

    if (intent.type === 'menu') {
      await this.setState(session.id, WhatsappSessionState.BROWSE);
      return this.reply(session.id, msg.from, this.welcome());
    }

    if (waitingFulfilment && (intent.type === 'collection' || intent.type === 'delivery')) {
      if (intent.type === 'collection') return this.finishCheckout(session.id, session.cartId, msg.from, 'COLLECTION');
      await this.prisma.whatsappSession.update({ where: { id: session.id }, data: { lastMessage: 'deliver' } });
      return this.reply(
        session.id,
        msg.from,
        'Ireland delivery. Send your Eircode and county, like D02 AF30 Dublin.',
      );
    }

    if (waitingDelivery) {
      if (intent.type === 'collection') return this.finishCheckout(session.id, session.cartId, msg.from, 'COLLECTION');
      return this.finishDeliveryCheckout(session.id, session.cartId, msg.from, raw);
    }

    if (intent.type === 'category') {
      return this.listCategory(session.id, msg.from, intent.slug);
    }

    if (intent.type === 'add') {
      return this.offerProduct(session.id, session.cartId, msg.from, intent.slug);
    }

    if (intent.type === 'pick') {
      if (variantsWait) {
        const variantId = variantsWait.ids[intent.index];
        if (!variantId) {
          return this.reply(session.id, msg.from, 'That number is not a size or colour on the last list. Reply a number, or MENU.');
        }
        return this.addVariant(session.id, session.cartId, msg.from, variantId);
      }
      const slugs = decodeWhatsappPicks(session.lastMessage);
      const slug = slugs[intent.index];
      if (!slug) {
        return this.reply(session.id, msg.from, 'That number is not on the last list. Tell me a piece or reply MENU.');
      }
      return this.offerProduct(session.id, session.cartId, msg.from, slug);
    }

    if (intent.type === 'remove' || intent.type === 'qty') {
      return this.editCart(session.id, session.cartId, msg.from, intent);
    }

    if (intent.type === 'cart') {
      return this.showCart(session.id, session.cartId, msg.from);
    }

    if (intent.type === 'track') {
      return this.trackOrder(session.id, msg.from);
    }

    if (intent.type === 'checkout' || intent.type === 'collection' || intent.type === 'delivery') {
      if (!session.cartId) return this.reply(session.id, msg.from, 'Your cart is empty. Tell me a piece first.');
      if (intent.type === 'collection') return this.finishCheckout(session.id, session.cartId, msg.from, 'COLLECTION');
      if (intent.type === 'delivery') {
        await this.prisma.whatsappSession.update({ where: { id: session.id }, data: { lastMessage: 'deliver' } });
        return this.reply(session.id, msg.from, 'Ireland delivery. Send your Eircode and county, like D02 AF30 Dublin.');
      }
      await this.prisma.whatsappSession.update({ where: { id: session.id }, data: { lastMessage: 'fulfill' } });
      return this.reply(
        session.id,
        msg.from,
        'Collection in Dublin, or Ireland delivery?\nReply COLLECT or DELIVER.',
      );
    }

    if (variantsWait) {
      const needle = intent.type === 'search' ? intent.q : raw;
      const matched = await this.matchWaitingVariant(variantsWait.ids, needle);
      if (matched) return this.addVariant(session.id, session.cartId, msg.from, matched);
    }

    if (intent.type === 'search') {
      return this.searchPieces(session.id, msg.from, intent.q);
    }
    return this.reply(session.id, msg.from, this.welcome());
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
    return this.reply(sessionId, to, `${slug.replace(/-/g, ' ')}\n\n${body}\n\nReply a number, then a size and colour.`);
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
      return this.offerProduct(sessionId, undefined, to, products[0].slug);
    }
    await this.prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { lastMessage: encodeWhatsappPicks(products.map((row) => row.slug)) },
    });
    const body = products.map((p, i) => `${i + 1}. ${p.title}`).join('\n');
    return this.reply(sessionId, to, `Here’s what I found:\n\n${body}\n\nReply a number, then a size and colour.`);
  }

  private async offerProduct(sessionId: string, cartId: string | null | undefined, from: string, slug: string) {
    const product = await this.prisma.product.findFirst({
      where: {
        published: true,
        OR: [{ slug }, { slug: slug.replace(/\s+/g, '-') }, { title: { equals: slug, mode: 'insensitive' } }],
      },
      include: { variants: { include: { inventory: true } } },
    });
    const inStock = (product?.variants ?? []).filter((variant) =>
      variant.active && variant.inventory.some((row) => availableStock(row.onHand, row.reserved) > 0),
    );
    if (!product || !inStock.length) {
      return this.reply(sessionId, from, 'That piece is out of stock. Try another colour or MENU.');
    }
    if (inStock.length === 1 && inStock[0]) {
      return this.addVariant(sessionId, cartId, from, inStock[0].id);
    }
    await this.prisma.whatsappSession.update({
      where: { id: sessionId },
      data: { lastMessage: encodeWhatsappVariants(product.slug, inStock.map((row) => row.id)) },
    });
    const lines = inStock.map((row, i) => `${i + 1}. ${row.size} / ${row.color}`).join('\n');
    return this.reply(
      sessionId,
      from,
      `${product.title}\nIn stock:\n${lines}\n\nReply a number, or the size and colour (sold-out pairs are not listed).`,
    );
  }

  private async matchWaitingVariant(ids: string[], q: string) {
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: ids } },
      include: { inventory: true },
    });
    const needle = q.trim().toLowerCase();
    const hit = variants.find((row) => {
      const size = row.size.toLowerCase();
      const color = row.color.toLowerCase();
      return (
        needle === size ||
        needle === color ||
        needle === `${size} ${color}` ||
        needle === `${color} ${size}` ||
        needle === `${size}/${color}` ||
        needle.includes(size) && needle.includes(color)
      );
    });
    if (!hit) return null;
    if (!hit.inventory.some((row) => availableStock(row.onHand, row.reserved) > 0)) return null;
    return hit.id;
  }

  private async addVariant(sessionId: string, cartId: string | null | undefined, from: string, variantId: string) {
    const variant = await this.prisma.productVariant.findFirst({
      where: { id: variantId, active: true, product: { published: true } },
      include: { inventory: true, product: true },
    });
    if (!variant || !variant.inventory.some((row) => availableStock(row.onHand, row.reserved) > 0)) {
      return this.reply(sessionId, from, 'That size and colour is gone. Pick another, or MENU.');
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
      data: { cartId: updated.id, state: WhatsappSessionState.CART, lastMessage: null },
    });
    return this.reply(
      sessionId,
      from,
      `Added ${variant.product.title} (${variant.size}/${variant.color}).\nCart €${(updated.subtotalCents / 100).toFixed(2)}\nReply CART, CHECKOUT, or keep shopping.`,
    );
  }

  private async showCart(sessionId: string, cartId: string | null, from: string) {
    const cart = cartId
      ? await this.carts.getOrCreate({ cartId, channel: SalesChannel.WHATSAPP, internal: true })
      : null;
    if (!cart?.items.length) return this.reply(sessionId, from, 'Your cart is empty. Tell me what you want, like “black hijab”.');
    const lines = cart.items.map((i, index) => `${index + 1}. ${i.title} ${i.size}/${i.color} × ${i.quantity}`).join('\n');
    return this.reply(
      sessionId,
      from,
      `${lines}\nTotal €${(cart.subtotalCents / 100).toFixed(2)}\nReply CHECKOUT, REMOVE, or QTY 2.`,
    );
  }

  private async editCart(
    sessionId: string,
    cartId: string | null,
    from: string,
    intent: { type: 'remove'; index?: number } | { type: 'qty'; quantity: number },
  ) {
    if (!cartId) return this.reply(sessionId, from, 'Your cart is empty.');
    const cart = await this.carts.getOrCreate({ cartId, channel: SalesChannel.WHATSAPP, internal: true });
    if (!cart.items.length) return this.reply(sessionId, from, 'Your cart is empty.');
    const index = intent.type === 'remove' ? intent.index ?? cart.items.length - 1 : cart.items.length - 1;
    const item = cart.items[index];
    if (!item) return this.reply(sessionId, from, 'That line is not in the cart. Reply CART to see numbers.');
    if (intent.type === 'remove') {
      await this.carts.remove(cart.id, item.id, SalesChannel.WHATSAPP, { internal: true });
      return this.showCart(sessionId, cart.id, from);
    }
    await this.carts.setQty(cart.id, item.id, intent.quantity, SalesChannel.WHATSAPP, { internal: true });
    return this.showCart(sessionId, cart.id, from);
  }

  private async trackOrder(sessionId: string, from: string) {
    const order = await this.prisma.order.findFirst({
      where: { OR: [{ phone: from }, { user: { phone: from } }] },
      orderBy: { createdAt: 'desc' },
      select: { id: true, status: true, fulfillment: true, trackingToken: true },
    });
    if (!order) {
      return this.reply(sessionId, from, 'I cannot see an order on this number yet. After checkout, reply TRACK any time.');
    }
    const status = ORDER_STATUS_LABEL[order.status] ?? order.status;
    const how = order.fulfillment === 'COLLECTION' ? 'Dublin collection' : 'Ireland delivery';
    return this.reply(
      sessionId,
      from,
      `Order ${order.id.slice(0, 8)} · ${status} · ${how}.`,
    );
  }

  private async finishCheckout(
    sessionId: string,
    cartId: string | null,
    from: string,
    fulfillment: 'COLLECTION' | 'DELIVERY',
    address?: { line1: string; city: string; county: string; eircode: string },
  ) {
    if (!cartId) return this.reply(sessionId, from, 'Your cart is empty. Tell me a piece first.');
    const cart = await this.carts.getOrCreate({ cartId, internal: true });
    const user = await this.prisma.user.findUnique({ where: { phone: from } });
    try {
      await this.commerce.assertFulfilment(fulfillment, SalesChannel.WHATSAPP);
      const priced = await this.commerce.price(
        { id: cart.id, subtotalCents: cart.subtotalCents },
        fulfillment,
        address?.county,
      );
      const order = await this.orders.checkout(
        {
          cartId: cart.id,
          fulfillment,
          email: user?.email ?? `${from}@whatsapp.motivefashion.ie`,
          name: user?.name ?? 'WhatsApp customer',
          phone: from,
          ...(address
            ? {
                address: {
                  line1: address.line1,
                  city: address.city,
                  county: address.county,
                  eircode: address.eircode,
                  country: 'IE' as const,
                },
                county: address.county,
              }
            : {}),
        },
        user?.id,
        SalesChannel.WHATSAPP,
      );
      const pay = await this.payments.createPaymentLink(order.id);
      await this.setState(sessionId, WhatsappSessionState.AWAITING_PAYMENT);
      await this.prisma.whatsappSession.update({ where: { id: sessionId }, data: { lastMessage: null } });
      const ship =
        fulfillment === 'COLLECTION'
          ? 'Collect in Dublin after payment.'
          : `Delivery ${priced.shippingCents ? `€${(priced.shippingCents / 100).toFixed(2)}` : 'free'}.`;
      return this.reply(
        sessionId,
        from,
        `Order ${order.id.slice(0, 8)} reserved.\nTotal €${(priced.totalCents / 100).toFixed(2)}. ${ship}\nPay securely: ${pay.url}`,
      );
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Could not start checkout.';
      return this.reply(sessionId, from, message);
    }
  }

  private async finishDeliveryCheckout(sessionId: string, cartId: string | null, from: string, raw: string) {
    const eircode = this.extractEircode(raw);
    const county = this.extractCounty(raw) ?? (eircode?.startsWith('D') ? IE_COUNTIES[0] : undefined);
    if (!eircode || !county) {
      return this.reply(sessionId, from, 'I need a valid Eircode and county, like D02 AF30 Dublin. Or reply COLLECT.');
    }
    return this.finishCheckout(sessionId, cartId, from, 'DELIVERY', {
      line1: `WhatsApp ${eircode}`,
      city: county.name,
      county: county.code,
      eircode,
    });
  }

  private extractEircode(raw: string) {
    const compact = raw.toUpperCase().replace(/[^A-Z0-9]/g, '');
    for (let i = 0; i <= compact.length - 7; i += 1) {
      const slice = compact.slice(i, i + 7);
      const spaced = `${slice.slice(0, 3)} ${slice.slice(3)}`;
      if (isValidEircode(spaced)) return normalizeEircode(spaced);
    }
    return null;
  }

  private extractCounty(raw: string) {
    const text = raw.toLowerCase();
    return IE_COUNTIES.find((row) => text.includes(row.name.toLowerCase()) || text.includes(row.code.toLowerCase()));
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
      'Reply a number for the piece, then a size and colour. CART, CHECKOUT, TRACK, REMOVE, or QTY 2.',
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
