import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { gdprUserSelect } from '../../common/user-select';
import { RbacService } from '../rbac/rbac.service';

@Injectable()
export class CustomersService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RbacService) private readonly rbac: RbacService,
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
      marketingOptIn: user.marketingOptIn,
      whatsappOptIn: user.whatsappOptIn,
      addresses: user.addresses,
      roles: user.memberships.map((m) => m.role),
      permissions,
    };
  }

  orders(userId: string) {
    return this.prisma.order.findMany({
      where: { userId },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });
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
