import { Injectable, NotFoundException } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { BRAND } from '@motive-fashion/config';

@Injectable()
export class CartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  async getOrCreate(opts: { cartId?: string; userId?: string; channel?: SalesChannel; sessionKey?: string }) {
    if (opts.cartId) {
      const existing = await this.prisma.cart.findUnique({
        where: { id: opts.cartId },
        include: { items: { include: { variant: { include: { product: true } } } } },
      });
      if (existing) return this.toDto(existing);
    }
    if (opts.sessionKey) {
      const bySession = await this.prisma.cart.findFirst({
        where: { sessionKey: opts.sessionKey },
        include: { items: { include: { variant: { include: { product: true } } } } },
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
      include: { items: { include: { variant: { include: { product: true } } } } },
    });
    return this.toDto(cart);
  }

  async add(cartId: string, variantId: string, quantity: number, channel: SalesChannel = SalesChannel.WEB) {
    const cart = await this.prisma.cart.findUnique({ where: { id: cartId } });
    if (!cart) throw new NotFoundException('Cart not found');
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
    return this.getOrCreate({ cartId });
  }

  async setQty(cartId: string, itemId: string, quantity: number, channel: SalesChannel = SalesChannel.WEB) {
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId } });
    if (!item) throw new NotFoundException();
    if (quantity < 1) return this.remove(cartId, itemId, channel);
    const delta = quantity - item.quantity;
    if (delta > 0) {
      await this.stock.reserve({ variantId: item.variantId, quantity: delta, channel, refId: cartId });
    } else if (delta < 0) {
      await this.stock.release({ variantId: item.variantId, quantity: -delta, channel, refId: cartId });
    }
    await this.prisma.cartItem.update({ where: { id: item.id }, data: { quantity } });
    return this.getOrCreate({ cartId });
  }

  async remove(cartId: string, itemId: string, channel: SalesChannel = SalesChannel.WEB) {
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
    return this.getOrCreate({ cartId });
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
        product: { title: string };
      };
    }[];
  }) {
    const items = cart.items.map((i) => ({
      id: i.id,
      variantId: i.variantId,
      sku: i.variant.sku,
      title: i.variant.product.title,
      size: i.variant.size,
      color: i.variant.color,
      quantity: i.quantity,
      unitPriceCents: i.variant.priceCents,
    }));
    return {
      id: cart.id,
      channel: cart.channel.toLowerCase(),
      expiresAt: cart.expiresAt?.toISOString() ?? null,
      items,
      subtotalCents: items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0),
    };
  }
}
