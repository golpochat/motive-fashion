import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { gdprUserSelect } from '../../common/user-select';
import { RbacService } from '../rbac/rbac.service';
import { CommerceService } from '../commerce/commerce.service';
import { addressLabelCode, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { OrderStatus, PaymentStatus, ReturnStatus, ReviewStatus } from '../../../generated/prisma';
import { isStaffWorkspace, staffMfaRequired } from '../../common/security-config';
import type { AddressCreateInput, AddressPatchInput } from '@motive-fashion/validation';
import { buildReviewEligibility, hasKeptPurchase } from './review-eligibility';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RbacService) private readonly rbac: RbacService,
    @Inject(CommerceService) private readonly commerce: CommerceService,
  ) {}

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        emailVerified: true,
        mfaEnabled: true,
        marketingOptIn: true,
        whatsappOptIn: true,
        addresses: true,
        memberships: { include: { role: { select: { id: true, slug: true, name: true } } } },
      },
    });
    if (!user) throw new NotFoundException();
    const permissions = await this.rbac.permissionsFor(userId);
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      role: user.role,
      emailVerified: user.emailVerified,
      mfaEnabled: user.mfaEnabled,
      marketingOptIn: user.marketingOptIn,
      whatsappOptIn: user.whatsappOptIn,
      addresses: user.addresses,
      roles: user.memberships.map((m) => m.role),
      permissions,
      mfaRequired: staffMfaRequired() && isStaffWorkspace(permissions) && !user.mfaEnabled,
      mfaLocked: staffMfaRequired() && isStaffWorkspace(permissions),
    };
  }

  orders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true, returns: { include: { items: true } }, shipments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async order(userId: string, orderId: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, userId },
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
    return order;
  }

  addresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { city: 'asc' }],
    });
  }

  async addAddress(userId: string, dto: AddressCreateInput) {
    const county = dto.county.trim().toUpperCase();
    await this.commerce.publishedCounty(county);
    const count = await this.prisma.address.count({ where: { userId } });
    const makeDefault = dto.isDefault === true || count === 0;
    if (makeDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.create({
      data: {
        userId,
        label: addressLabelCode(dto.label),
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        county,
        eircode: normalizeEircode(dto.eircode),
        country: 'IE',
        isDefault: makeDefault,
      },
    });
  }

  async patchAddress(userId: string, id: string, dto: AddressPatchInput) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();
    const county = dto.county ? dto.county.trim().toUpperCase() : existing.county;
    if (county) await this.commerce.publishedCounty(county);
    if (dto.eircode && !isValidEircode(dto.eircode)) {
      throw new BadRequestException('Enter a valid Eircode, like D02 AF30.');
    }
    if (dto.isDefault) {
      await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    }
    return this.prisma.address.update({
      where: { id },
      data: {
        label: dto.label ? addressLabelCode(dto.label) : undefined,
        line1: dto.line1,
        line2: dto.line2,
        city: dto.city,
        county,
        eircode: dto.eircode ? normalizeEircode(dto.eircode) : undefined,
        country: 'IE',
        isDefault: dto.isDefault ?? existing.isDefault,
      },
    });
  }

  async setDefaultAddress(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({ where: { id, userId } });
    if (!existing) throw new NotFoundException();
    await this.prisma.address.updateMany({ where: { userId }, data: { isDefault: false } });
    return this.prisma.address.update({ where: { id }, data: { isDefault: true } });
  }

  async removeAddress(userId: string, id: string) {
    const existing = await this.prisma.address.findFirst({
      where: { id, userId },
      include: { _count: { select: { orders: true } } },
    });
    if (!existing) throw new NotFoundException();
    if (existing._count.orders > 0) {
      throw new BadRequestException('This address is used on an order and cannot be deleted');
    }
    await this.prisma.address.delete({ where: { id } });
    if (existing.isDefault) {
      const next = await this.prisma.address.findFirst({ where: { userId }, orderBy: { city: 'asc' } });
      if (next) {
        await this.prisma.address.update({ where: { id: next.id }, data: { isDefault: true } });
      }
    }
    return { ok: true };
  }

  wishlist(userId: string) {
    return this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: { include: { images: { take: 1 } } } },
    });
  }

  addWish(userId: string, productId: string) {
    return this.prisma.wishlistItem.upsert({
      where: { userId_productId: { userId, productId } },
      create: { userId, productId },
      update: {},
    });
  }

  removeWish(userId: string, productId: string) {
    return this.prisma.wishlistItem.delete({
      where: { userId_productId: { userId, productId } },
    });
  }

  async reviewEligibility(userId: string, productId: string) {
    const [lines, existing] = await Promise.all([
      this.prisma.orderItem.findMany({
        where: {
          variant: { productId },
          quantity: { gt: 0 },
          order: { userId, status: { in: [OrderStatus.DELIVERED, OrderStatus.COLLECTED] } },
        },
        select: {
          quantity: true,
          returnItems: {
            where: { return: { status: { in: [ReturnStatus.RECEIVED, ReturnStatus.REFUNDED] } } },
            select: { quantity: true },
          },
        },
      }),
      this.prisma.review.findUnique({
        where: { productId_userId: { productId, userId } },
        select: { status: true },
      }),
    ]);
    const purchased = hasKeptPurchase(
      lines.map((line) => ({
        quantity: line.quantity,
        returnedQty: line.returnItems.reduce((sum, row) => sum + row.quantity, 0),
      })),
    );
    return buildReviewEligibility(purchased, existing?.status ?? null);
  }

  async addReview(userId: string, dto: { productId: string; rating: number; body: string }) {
    const eligibility = await this.reviewEligibility(userId, dto.productId);
    if (!eligibility.purchased) {
      throw new BadRequestException('You can review a piece after it is delivered or collected, if you still have it.');
    }
    if (eligibility.alreadyReviewed) throw new BadRequestException('You already reviewed this piece.');
    return this.prisma.review.create({
      data: {
        productId: dto.productId,
        userId,
        rating: dto.rating,
        body: dto.body,
        status: ReviewStatus.PENDING,
      },
    });
  }

  registerPush(userId: string, dto: { token: string; platform: string }) {
    return this.prisma.pushToken.upsert({
      where: { token: dto.token },
      create: { userId, token: dto.token, platform: dto.platform },
      update: { userId, platform: dto.platform },
    });
  }

  async gdprExport(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: gdprUserSelect,
    });
    return { exportedAt: new Date().toISOString(), user };
  }

  async gdprDelete(userId: string) {
    await this.prisma.refreshToken.deleteMany({ where: { userId } });
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        deletedAt: new Date(),
        email: `deleted+${userId}@motivefashion.invalid`,
        phone: null,
        name: 'Deleted customer',
        passwordHash: null,
      },
    });
    return { ok: true };
  }
}
