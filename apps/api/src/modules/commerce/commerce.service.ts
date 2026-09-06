import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { SalesChannel } from '@prisma/client';
import {
  DEFAULT_COUNTY_RATE_CENTS,
  DEFAULT_FREE_SHIP_OVER_CENTS,
  IE_COUNTIES,
  RETURN_POSTAGE_NOTICE,
} from '@motive-fashion/config';
import { promoDiscountCents, quoteShippingCents, splitVatInclusive } from '@motive-fashion/utils';
import type { CheckoutQuoteInput } from '@motive-fashion/validation';
import { PrismaService } from '../../prisma/prisma.service';

export type PricedCart = {
  cartId: string;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  countyRateCents: number | null;
  freeOverCents: number | null;
  shippingWaived: boolean;
  needsCounty: boolean;
  promoCodeId?: string;
  shippingCounty?: string;
};

@Injectable()
export class CommerceService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async ensureDefaults() {
    const [methods, counties, payments] = await Promise.all([
      this.prisma.fulfilmentMethodConfig.count(),
      this.prisma.deliveryCounty.count(),
      this.prisma.paymentMethodConfig.count(),
    ]);
    if (methods === 0) {
      await this.prisma.fulfilmentMethodConfig.createMany({
        data: [
          {
            code: 'DELIVERY',
            name: 'Ireland delivery',
            published: true,
            isDefault: true,
            sortOrder: 0,
            feeCents: 0,
            freeOverCents: DEFAULT_FREE_SHIP_OVER_CENTS,
          },
          {
            code: 'COLLECTION',
            name: 'Collect in Dublin',
            published: true,
            isDefault: false,
            sortOrder: 1,
            feeCents: 0,
            freeOverCents: null,
          },
        ],
      });
    }
    if (counties === 0) {
      await this.prisma.deliveryCounty.createMany({
        data: IE_COUNTIES.map((row, index) => ({
          code: row.code,
          name: row.name,
          published: true,
          rateCents: DEFAULT_COUNTY_RATE_CENTS,
          sortOrder: index,
        })),
      });
    }
    if (payments === 0) {
      await this.prisma.paymentMethodConfig.createMany({
        data: [
          {
            code: 'CARD',
            name: 'Card',
            published: true,
            isDefault: true,
            publicChannel: true,
            sortOrder: 0,
          },
          {
            code: 'CASH',
            name: 'Cash',
            published: true,
            isDefault: false,
            publicChannel: false,
            sortOrder: 1,
          },
        ],
      });
    }
    await this.ensureCommercePermission();
  }

  private async ensureCommercePermission() {
    const perm = await this.prisma.permission.upsert({
      where: { key: 'commerce.settings' },
      create: {
        key: 'commerce.settings',
        name: 'Edit checkout methods and county rates',
        group: 'Commerce',
      },
      update: { name: 'Edit checkout methods and county rates', group: 'Commerce' },
    });
    const admin = await this.prisma.role.findUnique({ where: { slug: 'admin' } });
    if (!admin) return;
    await this.prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: admin.id, permissionId: perm.id } },
      create: { roleId: admin.id, permissionId: perm.id },
      update: {},
    });
  }

  async publicOptions() {
    await this.ensureDefaults();
    const [fulfilment, payments, counties] = await Promise.all([
      this.prisma.fulfilmentMethodConfig.findMany({
        where: { published: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.paymentMethodConfig.findMany({
        where: { published: true, publicChannel: true },
        orderBy: { sortOrder: 'asc' },
      }),
      this.prisma.deliveryCounty.findMany({
        where: { published: true },
        orderBy: { sortOrder: 'asc' },
      }),
    ]);
    const card = payments.find((p) => p.code === 'CARD');
    const blocked =
      fulfilment.length === 0
        ? 'Checkout is unavailable: no fulfilment method is published.'
        : !card
          ? 'Checkout is unavailable: card payments are not published.'
          : null;
    const defaultFulfilment =
      fulfilment.find((m) => m.isDefault)?.code ??
      fulfilment.find((m) => m.code === 'DELIVERY')?.code ??
      fulfilment[0]?.code ??
      'DELIVERY';
    return {
      blocked,
      fulfilment,
      payments,
      counties,
      defaultFulfilment,
      returnNotice: RETURN_POSTAGE_NOTICE,
    };
  }

  async adminSnapshot() {
    await this.ensureDefaults();
    const [fulfilment, payments, counties] = await Promise.all([
      this.prisma.fulfilmentMethodConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.paymentMethodConfig.findMany({ orderBy: { sortOrder: 'asc' } }),
      this.prisma.deliveryCounty.findMany({ orderBy: { sortOrder: 'asc' } }),
    ]);
    return { fulfilment, payments, counties, returnNotice: RETURN_POSTAGE_NOTICE };
  }

  async quote(input: CheckoutQuoteInput, userId?: string): Promise<PricedCart> {
    await this.ensureDefaults();
    const cart = await this.loadPricedCart(input.cartId, userId, input.sessionKey);
    return this.price(cart, input.fulfillment, input.county, input.promoCode);
  }

  async price(
    cart: { id: string; subtotalCents: number },
    fulfillment: 'DELIVERY' | 'COLLECTION',
    countyCode?: string,
    promoCode?: string,
  ): Promise<PricedCart> {
    const method = await this.prisma.fulfilmentMethodConfig.findUnique({ where: { code: fulfillment } });
    if (!method?.published) {
      throw new BadRequestException('That fulfilment method is not available');
    }
    const promo = await this.resolvePromo(cart.subtotalCents, promoCode);
    const goods = Math.max(0, cart.subtotalCents - promo.discountCents);
    const needsCounty = fulfillment === 'DELIVERY';
    let countyRateCents: number | null = null;
    let shippingCounty: string | undefined;
    if (needsCounty && countyCode) {
      const county = await this.publishedCounty(countyCode);
      countyRateCents = county.rateCents;
      shippingCounty = county.code;
    }
    const shippingCents =
      needsCounty && countyRateCents == null
        ? 0
        : quoteShippingCents({
            fulfillment,
            goodsCents: goods,
            collectionFeeCents: method.feeCents,
            countyRateCents: countyRateCents ?? 0,
            freeOverCents: method.freeOverCents,
          });
    const taxable = goods + (needsCounty && countyRateCents == null ? 0 : shippingCents);
    const { taxCents } = splitVatInclusive(taxable);
    return {
      cartId: cart.id,
      subtotalCents: cart.subtotalCents,
      discountCents: promo.discountCents,
      shippingCents: needsCounty && countyRateCents == null ? 0 : shippingCents,
      taxCents,
      totalCents: taxable,
      countyRateCents,
      freeOverCents: method.freeOverCents,
      shippingWaived: fulfillment === 'DELIVERY' && shippingCents === 0 && countyRateCents != null,
      needsCounty: needsCounty && countyRateCents == null,
      promoCodeId: promo.id,
      shippingCounty,
    };
  }

  async assertPublicPayment(method: 'CARD' | 'CASH' | undefined, channel: SalesChannel) {
    await this.ensureDefaults();
    const code = method ?? (channel === SalesChannel.POS ? 'CASH' : 'CARD');
    if (channel === SalesChannel.POS) {
      return code === 'CASH' ? 'CASH' : 'CARD';
    }
    if (code === 'CASH') {
      throw new ForbiddenException('Cash is not available on this channel');
    }
    const card = await this.prisma.paymentMethodConfig.findUnique({ where: { code: 'CARD' } });
    if (!card?.published || !card.publicChannel) {
      throw new BadRequestException('Card payments are not available');
    }
    return 'CARD' as const;
  }

  async assertFulfilment(code: 'DELIVERY' | 'COLLECTION', channel: SalesChannel) {
    await this.ensureDefaults();
    if (channel === SalesChannel.POS || channel === SalesChannel.WHATSAPP) {
      return code;
    }
    const method = await this.prisma.fulfilmentMethodConfig.findUnique({ where: { code } });
    if (!method?.published) {
      throw new BadRequestException('That fulfilment method is not available');
    }
    return code;
  }

  async publishedCounty(code: string) {
    const county = await this.prisma.deliveryCounty.findUnique({
      where: { code: code.trim().toUpperCase() },
    });
    if (!county?.published) {
      throw new BadRequestException('Please choose a published Irish county');
    }
    return county;
  }

  async patchFulfilment(
    id: string,
    dto: {
      name?: string;
      published?: boolean;
      isDefault?: boolean;
      feeCents?: number;
      freeOverCents?: number | null;
    },
  ) {
    const row = await this.prisma.fulfilmentMethodConfig.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (dto.published === false) {
      const others = await this.prisma.fulfilmentMethodConfig.count({
        where: { published: true, id: { not: id } },
      });
      if (others === 0) {
        throw new BadRequestException('Keep at least one fulfilment method published');
      }
    }
    if (dto.isDefault) {
      await this.prisma.fulfilmentMethodConfig.updateMany({ data: { isDefault: false } });
    }
    return this.prisma.fulfilmentMethodConfig.update({ where: { id }, data: dto });
  }

  async patchCounty(id: string, dto: { published?: boolean; rateCents?: number }) {
    const row = await this.prisma.deliveryCounty.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (dto.published === false) {
      const others = await this.prisma.deliveryCounty.count({
        where: { published: true, id: { not: id } },
      });
      const deliveryOn = await this.prisma.fulfilmentMethodConfig.findFirst({
        where: { code: 'DELIVERY', published: true },
      });
      if (others === 0 && deliveryOn) {
        throw new BadRequestException('Keep at least one county published while Delivery is on');
      }
    }
    return this.prisma.deliveryCounty.update({ where: { id }, data: dto });
  }

  async patchPayment(id: string, dto: { name?: string; published?: boolean; isDefault?: boolean }) {
    const row = await this.prisma.paymentMethodConfig.findUnique({ where: { id } });
    if (!row) throw new NotFoundException();
    if (dto.published === false && row.publicChannel) {
      const others = await this.prisma.paymentMethodConfig.count({
        where: { published: true, publicChannel: true, id: { not: id } },
      });
      if (others === 0) {
        throw new BadRequestException('Keep at least one public payment method published');
      }
    }
    if (dto.isDefault) {
      await this.prisma.paymentMethodConfig.updateMany({ data: { isDefault: false } });
    }
    return this.prisma.paymentMethodConfig.update({ where: { id }, data: dto });
  }

  private async resolvePromo(subtotalCents: number, code?: string) {
    if (!code?.trim()) return { id: undefined as string | undefined, discountCents: 0 };
    const promo = await this.prisma.promoCode.findUnique({ where: { code: code.trim().toUpperCase() } });
    const now = new Date();
    const valid =
      promo?.active &&
      (!promo.startsAt || promo.startsAt <= now) &&
      (!promo.endsAt || promo.endsAt >= now) &&
      (promo.maxUses == null || promo.usedCount < promo.maxUses);
    if (!valid || !promo) {
      throw new BadRequestException('Promo code is not valid');
    }
    return { id: promo.id, discountCents: promoDiscountCents(subtotalCents, promo.type, promo.value) };
  }

  private async loadPricedCart(cartId: string, userId?: string, sessionKey?: string) {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: { include: { variant: true } } },
    });
    if (!cart || cart.items.length === 0) throw new BadRequestException('Cart is empty');
    const ownerOk = Boolean(userId && cart.userId === userId);
    const sessionOk = Boolean(sessionKey && cart.sessionKey && sessionKey === cart.sessionKey);
    if (!ownerOk && !sessionOk) throw new ForbiddenException('Cart does not belong to this session');
    const subtotalCents = cart.items.reduce((sum, item) => sum + item.variant.priceCents * item.quantity, 0);
    return { id: cart.id, subtotalCents };
  }
}
