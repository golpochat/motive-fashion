import { Injectable, NotFoundException } from '@nestjs/common';
import { InboundShipmentStatus, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';

@Injectable()
export class ProcurementService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly stock: StockService,
  ) {}

  suppliers() {
    return this.prisma.supplier.findMany({
      include: { products: true, _count: { select: { purchaseOrders: true } } },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
    });
  }

  listPOs() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, lines: { include: { variant: true } }, shipments: true },
      orderBy: { monthBucket: 'asc' },
    });
  }

  calendar() {
    return this.prisma.purchaseOrder.groupBy({
      by: ['monthBucket', 'status'],
      _count: true,
    });
  }

  suggestions() {
    return this.stock.restockSuggestions();
  }

  async markOrdered(id: string, actorId: string) {
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED, orderedAt: new Date() },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.ordered', entity: 'PurchaseOrder', entityId: id },
    });
    return po;
  }

  async createShipment(purchaseOrderId: string, tracking: string | undefined, actorId: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id: purchaseOrderId } });
    if (!po) throw new NotFoundException();
    await this.prisma.purchaseOrder.update({
      where: { id: purchaseOrderId },
      data: { status: PurchaseOrderStatus.IN_TRANSIT },
    });
    const shipment = await this.prisma.inboundShipment.create({
      data: {
        purchaseOrderId,
        tracking,
        status: InboundShipmentStatus.IN_TRANSIT,
        shippedAt: new Date(),
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.ship', entity: 'InboundShipment', entityId: shipment.id },
    });
    return shipment;
  }

  async receiveShipment(id: string, actorId: string) {
    const shipment = await this.prisma.inboundShipment.findUnique({
      where: { id },
      include: { purchaseOrder: { include: { lines: true } } },
    });
    if (!shipment) throw new NotFoundException();
    for (const line of shipment.purchaseOrder.lines) {
      const remaining = line.quantity - line.receivedQty;
      if (remaining <= 0) continue;
      await this.stock.receive({
        variantId: line.variantId,
        quantity: remaining,
        refId: shipment.id,
        note: `PO ${shipment.purchaseOrderId}`,
      });
      await this.prisma.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: line.quantity },
      });
    }
    await this.prisma.inboundShipment.update({
      where: { id },
      data: { status: InboundShipmentStatus.RECEIVED, receivedAt: new Date() },
    });
    await this.prisma.purchaseOrder.update({
      where: { id: shipment.purchaseOrderId },
      data: { status: PurchaseOrderStatus.RECEIVED },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.receive', entity: 'InboundShipment', entityId: id },
    });
    return { ok: true };
  }
}
