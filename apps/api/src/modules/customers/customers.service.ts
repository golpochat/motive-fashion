import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

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
      },
    });
    if (!user) throw new NotFoundException();
    return user;
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
      include: { addresses: true, orders: { include: { items: true } }, wishlist: true },
    });
    return { exportedAt: new Date().toISOString(), user };
  }

  async gdprDelete(userId: string) {
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
