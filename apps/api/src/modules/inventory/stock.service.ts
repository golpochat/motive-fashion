import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma, SalesChannel, StockMovementType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { availableStock } from '@motive-fashion/utils';

const DEFAULT_LOCATION = 'warehouse';

@Injectable()
export class StockService {
  constructor(private readonly prisma: PrismaService) {}

  available(onHand: number, reserved: number) {
    return availableStock(onHand, reserved);
  }

  async getLevel(variantId: string, locationId?: string) {
    const location = await this.resolveLocation(locationId);
    return this.prisma.inventoryLevel.findUniqueOrThrow({
      where: { variantId_locationId: { variantId, locationId: location.id } },
    });
  }

  async reserve(params: {
    variantId: string;
    quantity: number;
    channel: SalesChannel;
    refId: string;
    locationId?: string;
  }) {
    if (params.quantity < 1) throw new BadRequestException('Quantity must be positive');
    return this.prisma.$transaction(async (tx) => {
      const location = await this.resolveLocation(params.locationId, tx);
      const level = await tx.inventoryLevel.findUnique({
        where: { variantId_locationId: { variantId: params.variantId, locationId: location.id } },
      });
      if (!level) throw new BadRequestException('SKU not stocked at location');
      const free = this.available(level.onHand, level.reserved);
      if (free < params.quantity) {
        throw new BadRequestException(`Insufficient stock for ${params.variantId}`);
      }
      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { reserved: { increment: params.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: location.id,
          type: StockMovementType.RESERVE,
          quantity: params.quantity,
          channel: params.channel,
          refId: params.refId,
        },
      });
      return updated;
    });
  }

  async release(params: {
    variantId: string;
    quantity: number;
    channel: SalesChannel;
    refId: string;
    locationId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const location = await this.resolveLocation(params.locationId, tx);
      const level = await tx.inventoryLevel.findUniqueOrThrow({
        where: { variantId_locationId: { variantId: params.variantId, locationId: location.id } },
      });
      const nextReserved = Math.max(0, level.reserved - params.quantity);
      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { reserved: nextReserved },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: location.id,
          type: StockMovementType.RELEASE,
          quantity: params.quantity,
          channel: params.channel,
          refId: params.refId,
        },
      });
      return updated;
    });
  }

  async commit(params: {
    variantId: string;
    quantity: number;
    channel: SalesChannel;
    refId: string;
    locationId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const location = await this.resolveLocation(params.locationId, tx);
      const level = await tx.inventoryLevel.findUniqueOrThrow({
        where: { variantId_locationId: { variantId: params.variantId, locationId: location.id } },
      });
      if (level.onHand < params.quantity) {
        throw new BadRequestException('Cannot commit more than on-hand');
      }
      const nextReserved = Math.max(0, level.reserved - params.quantity);
      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: {
          onHand: { decrement: params.quantity },
          reserved: nextReserved,
        },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: location.id,
          type: StockMovementType.COMMIT,
          quantity: params.quantity,
          channel: params.channel,
          refId: params.refId,
        },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: location.id,
          type: StockMovementType.SALE,
          quantity: params.quantity,
          channel: params.channel,
          refId: params.refId,
        },
      });
      return updated;
    });
  }

  async receive(params: {
    variantId: string;
    quantity: number;
    refId: string;
    locationId?: string;
    note?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const location = await this.resolveLocation(params.locationId, tx);
      const level = await tx.inventoryLevel.upsert({
        where: { variantId_locationId: { variantId: params.variantId, locationId: location.id } },
        create: {
          variantId: params.variantId,
          locationId: location.id,
          onHand: params.quantity,
        },
        update: { onHand: { increment: params.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: location.id,
          type: StockMovementType.RECEIVE,
          quantity: params.quantity,
          refId: params.refId,
          note: params.note,
        },
      });
      return level;
    });
  }

  async adjust(params: {
    variantId: string;
    locationId: string;
    delta: number;
    reason: string;
    actorId?: string;
  }) {
    return this.prisma.$transaction(async (tx) => {
      const level = await tx.inventoryLevel.findUniqueOrThrow({
        where: {
          variantId_locationId: { variantId: params.variantId, locationId: params.locationId },
        },
      });
      const next = level.onHand + params.delta;
      if (next < 0) throw new BadRequestException('Adjustment would make on-hand negative');
      const updated = await tx.inventoryLevel.update({
        where: { id: level.id },
        data: { onHand: next },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: params.locationId,
          type: StockMovementType.ADJUST,
          quantity: params.delta,
          note: params.reason,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: params.actorId,
          action: 'inventory.adjust',
          entity: 'InventoryLevel',
          entityId: updated.id,
          meta: { delta: params.delta, reason: params.reason },
        },
      });
      return updated;
    });
  }

  async transfer(params: {
    variantId: string;
    fromLocationId: string;
    toLocationId: string;
    quantity: number;
  }) {
    if (params.fromLocationId === params.toLocationId) {
      throw new BadRequestException('Locations must differ');
    }
    return this.prisma.$transaction(async (tx) => {
      const from = await tx.inventoryLevel.findUniqueOrThrow({
        where: {
          variantId_locationId: {
            variantId: params.variantId,
            locationId: params.fromLocationId,
          },
        },
      });
      if (this.available(from.onHand, from.reserved) < params.quantity) {
        throw new BadRequestException('Not enough free stock to transfer');
      }
      await tx.inventoryLevel.update({
        where: { id: from.id },
        data: { onHand: { decrement: params.quantity } },
      });
      await tx.inventoryLevel.upsert({
        where: {
          variantId_locationId: { variantId: params.variantId, locationId: params.toLocationId },
        },
        create: {
          variantId: params.variantId,
          locationId: params.toLocationId,
          onHand: params.quantity,
        },
        update: { onHand: { increment: params.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: params.fromLocationId,
          type: StockMovementType.TRANSFER_OUT,
          quantity: params.quantity,
        },
      });
      await tx.stockMovement.create({
        data: {
          variantId: params.variantId,
          locationId: params.toLocationId,
          type: StockMovementType.TRANSFER_IN,
          quantity: params.quantity,
        },
      });
    });
  }

  async restockSuggestions() {
    const levels = await this.prisma.inventoryLevel.findMany({
      include: {
        variant: { include: { product: true, poLines: { include: { purchaseOrder: true } } } },
        location: true,
      },
    });
    return levels
      .map((level) => {
        const inbound = level.variant.poLines
          .filter((l) =>
            ['DRAFT', 'ORDERED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(
              l.purchaseOrder.status,
            ),
          )
          .reduce((sum, l) => sum + (l.quantity - l.receivedQty), 0);
        const cover = level.onHand + inbound;
        return {
          variantId: level.variantId,
          sku: level.variant.sku,
          title: level.variant.product.title,
          location: level.location.code,
          onHand: level.onHand,
          reserved: level.reserved,
          inbound,
          reorderPoint: level.reorderPoint,
          suggestedQty: Math.max(0, level.reorderPoint * 2 - cover),
          needsRestock: cover < level.reorderPoint,
        };
      })
      .filter((row) => row.needsRestock);
  }

  private async resolveLocation(locationId?: string, tx: Prisma.TransactionClient | PrismaService = this.prisma) {
    if (locationId) {
      return tx.location.findUniqueOrThrow({ where: { id: locationId } });
    }
    return tx.location.findUniqueOrThrow({ where: { code: DEFAULT_LOCATION } });
  }
}
