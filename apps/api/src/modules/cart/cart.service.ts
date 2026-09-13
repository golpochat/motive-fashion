import { ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { BRAND } from '@motive-fashion/config';

type CartAccess = { userId?: string; sessionKey?: string; internal?: boolean; channel?: SalesChannel };

const CART_INCLUDE = {
  items: {
    include: {
      variant: {
        include: {
          product: { include: { images: { orderBy: { sortOrder: 'asc' as const }, take: 1 } } },
        },
      },
    },
  },
};

@Injectable()
export class CartService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stock: StockService,
  ) {}

  async getOrCreate(opts: {
    cartId?: string;
    userId?: string;
    channel?: SalesChannel;
    sessionKey?: string;
    internal?: boolean;
  }) {
    if (opts.cartId) {
      const existing = await this.prisma.cart.findUnique({
        where: { id: opts.cartId },
        include: CART_INCLUDE,
      });
      if (existing) {
        await this.assertAccess(existing, { ...opts, internal: opts.internal || opts.channel === SalesChannel.WHATSAPP });
        return this.toDto(existing);
      }
    }
    if (opts.sessionKey) {
      const bySession = await this.prisma.cart.findFirst({
        where: { sessionKey: opts.sessionKey },
        include: CART_INCLUDE,
        orderBy: { updatedAt: 'desc' },
      });
      if (bySession) return this.toDto(bySession);
    }
    const cart = await this.prisma.cart.create({
      data: {
        userId: opts.userId,
        channel: opts.channel ?? SalesChannel.WEB,
        sessionKey: opts.sessionKey,
        expiresAt: new Date(Date.now() + BRAND.reservationMinutes * 60 * 1000),
      },
      include: CART_INCLUDE,
    });
    return this.toDto(cart);
  }

  async add(
    cartId: string,
    variantId: string,
    quantity: number,
    channel: SalesChannel = SalesChannel.WEB,
    access?: CartAccess,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    this.assertAccess(cart, { ...access, channel });
    const existing = await this.prisma.cartItem.findFirst({ where: { cartId, variantId } });
    const nextQty = (existing?.quantity ?? 0) + quantity;
    await this.stock.reserve({
      variantId,
      quantity,
      channel,
      refId: cartId,
    });
    if (existing) {
      await this.prisma.cartItem.update({
        where: { id: existing.id },
        data: { quantity: nextQty, reserved: true },
      });
    } else {
      await this.prisma.cartItem.create({
        data: { cartId, variantId, quantity, reserved: true },
      });
    }
    await this.prisma.cart.update({
      where: { id: cartId },
      data: { expiresAt: new Date(Date.now() + BRAND.reservationMinutes * 60 * 1000) },
    });
    return this.getOrCreate({ cartId, ...access, internal: true });
  }

  async setQty(
    cartId: string,
    itemId: string,
    quantity: number,
    channel: SalesChannel = SalesChannel.WEB,
    access?: CartAccess,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    this.assertAccess(cart, access);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException();
    if (quantity < 1) return this.remove(cartId, itemId, channel, access);
    const delta = quantity - item.quantity;
    if (delta > 0) {
      await this.stock.reserve({ variantId: item.variantId, quantity: delta, channel, refId: cartId });
    } else if (delta < 0) {
      await this.stock.release({ variantId: item.variantId, quantity: -delta, channel, refId: cartId });
    }
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return this.getOrCreate({ cartId, ...access, internal: true });
  }

  async remove(
    cartId: string,
    itemId: string,
    channel: SalesChannel = SalesChannel.WEB,
    access?: CartAccess,
  ) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
    this.assertAccess(cart, access);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException();
    if (item.reserved) {
      await this.stock.release({
        variantId: item.variantId,
        quantity: item.quantity,
        channel,
        refId: cartId,
      });
    }
    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return this.getOrCreate({ cartId, ...access, internal: true });
  }

  async expireStale() {
    const stale = await this.prisma.cart.findMany({
      where: { expiresAt: { lt: new Date() }, items: { some: { reserved: true } } },
      include: { items: true },
    });
    for (const cart of stale) {
      for (const item of cart.items) {
        if (item.reserved) {
          await this.stock.release({
            variantId: item.variantId,
            quantity: item.quantity,
            channel: cart.channel,
            refId: cart.id,
          });
          await this.prisma.cartItem.update({ where: { id: item.id }, data: { reserved: false } });
        }
      }
    }
    return { released: stale.length };
  }

  private assertAccess(
    cart: { userId: string | null; sessionKey: string | null; channel: SalesChannel },
    access?: CartAccess,
  ) {
    if (access?.internal) return;
    if (cart.channel === SalesChannel.WHATSAPP || cart.channel === SalesChannel.POS) return;
    if (cart.userId && access?.userId === cart.userId) return;
    if (cart.sessionKey && access?.sessionKey === cart.sessionKey) return;
    throw new ForbiddenException('Cart does not belong to this session');
  }

  private toDto(cart: {
    id: string;
    channel: SalesChannel;
    expiresAt: Date | null;
    items: {
      id: string;
      quantity: number;
      variantId: string;
      variant: {
        sku: string;
        size: string;
        color: string;
        priceCents: number;
        product: { title: string; images: { url: string; alt: string }[] };
      };
    }[];
  }) {
    const items = cart.items.map((i) => {
      const image = i.variant.product.images[0];
      return {
        id: i.id,
        variantId: i.variantId,
        sku: i.variant.sku,
        title: i.variant.product.title,
        size: i.variant.size,
        color: i.variant.color,
        quantity: i.quantity,
        unitPriceCents: i.variant.priceCents,
        imageUrl: image?.url ?? null,
        imageAlt: image?.alt ?? i.variant.product.title,
      };
    });
    return {
      id: cart.id,
      channel: cart.channel.toLowerCase(),
      expiresAt: cart.expiresAt?.toISOString() ?? null,
      items,
      subtotalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    };
  }
}
