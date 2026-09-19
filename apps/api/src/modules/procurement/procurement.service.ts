import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { InboundShipmentStatus, OrderStatus, PurchaseOrderStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { StockService } from '../inventory/stock.service';
import { purchaseOrderCreateSchema, purchaseOrderPatchSchema, receiveShipmentSchema, supplierCreateSchema, supplierPatchSchema, supplierProductLinkSchema, supplierProductPatchSchema } from '@motive-fashion/validation';
import { addPoLineUnits, mergePoLines, monthBucketNow, sellPace, suggestedBuyQty } from './procurement-board';

@Injectable()
export class ProcurementService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(StockService) private readonly stock: StockService,
  ) {}

  async suppliers() {
    const rows = await this.prisma.supplier.findMany({
      include: {
        products: { select: { productId: true, product: { select: { variants: { select: { id: true } } } } } },
        purchaseOrders: { select: { status: true, lines: { select: { quantity: true, receivedQty: true } } } },
      },
      orderBy: [{ country: 'asc' }, { name: 'asc' }],
    });
    const variantToSupplier = new Map<string, string>();
    for (const row of rows) {
      for (const link of row.products) {
        for (const variant of link.product.variants) variantToSupplier.set(variant.id, row.id);
      }
    }
    const sold30d = await this.soldByVariant([...variantToSupplier.keys()], this.daysAgo(30), new Date());
    return rows.map((row) => {
      const units = { draft: 0, ordered: 0, inTransit: 0, received: 0 };
      for (const po of row.purchaseOrders) {
        for (const line of po.lines) addPoLineUnits(units, po.status, line.quantity, line.receivedQty);
      }
      let sold = 0;
      for (const link of row.products) {
        for (const variant of link.product.variants) sold += sold30d.get(variant.id) ?? 0;
      }
      return {
        id: row.id,
        name: row.name,
        country: row.country,
        email: row.email,
        phone: row.phone,
        notes: row.notes,
        example: row.example,
        skuCount: row.products.reduce((sum, link) => sum + link.product.variants.length, 0),
        draftUnits: units.draft,
        orderedUnits: units.ordered,
        inTransitUnits: units.inTransit,
        receivedUnits: units.received,
        sold30d: sold,
      };
    });
  }

  async supplierBoard(id: string) {
    const supplier = await this.prisma.supplier.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            product: {
              include: {
                variants: { include: { inventory: true } },
              },
            },
          },
        },
        purchaseOrders: {
          include: { lines: { include: { variant: true } }, shipments: true },
          orderBy: { monthBucket: 'asc' },
        },
      },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const variants = supplier.products.flatMap((link) =>
      link.product.variants.map((variant) => ({ variant, productTitle: link.product.title })),
    );
    const variantIds = variants.map((row) => row.variant.id);
    const now = new Date();
    const d30 = this.daysAgo(30);
    const d60 = this.daysAgo(60);
    const [soldAll, sold30d, soldPrev] = await Promise.all([
      this.soldByVariant(variantIds),
      this.soldByVariant(variantIds, d30, now),
      this.soldByVariant(variantIds, d60, d30),
    ]);

    const units = { draft: 0, ordered: 0, inTransit: 0, received: 0 };
    for (const po of supplier.purchaseOrders) {
      for (const line of po.lines) addPoLineUnits(units, po.status, line.quantity, line.receivedQty);
    }

    const inboundByVariant = new Map<string, number>();
    for (const po of supplier.purchaseOrders) {
      if (!['DRAFT', 'ORDERED', 'IN_TRANSIT', 'PARTIALLY_RECEIVED'].includes(po.status)) continue;
      for (const line of po.lines) {
        inboundByVariant.set(
          line.variantId,
          (inboundByVariant.get(line.variantId) ?? 0) + Math.max(0, line.quantity - line.receivedQty),
        );
      }
    }

    const skus = variants
      .map(({ variant, productTitle }) => {
        const onHand = variant.inventory.reduce((sum, level) => sum + level.onHand, 0);
        const reserved = variant.inventory.reduce((sum, level) => sum + level.reserved, 0);
        const reorderPoint = variant.inventory.reduce((sum, level) => Math.max(sum, level.reorderPoint), 0);
        const inbound = inboundByVariant.get(variant.id) ?? 0;
        const sold30 = sold30d.get(variant.id) ?? 0;
        const prev = soldPrev.get(variant.id) ?? 0;
        const link = supplier.products.find((row) => row.product.variants.some((item) => item.id === variant.id));
        const moq = link?.moq ?? 1;
        return {
          variantId: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          productTitle,
          size: variant.size,
          color: variant.color,
          onHand,
          reserved,
          inbound,
          reorderPoint,
          moq,
          unitCostCents: link?.unitCostCents ?? variant.costCents,
          suggestedQty: suggestedBuyQty(onHand, inbound, reorderPoint),
          soldAll: soldAll.get(variant.id) ?? 0,
          sold30d: sold30,
          soldPrev30d: prev,
          pace: sellPace(sold30, prev),
          needsRestock: onHand + inbound < reorderPoint,
        };
      })
      .sort((a, b) => b.sold30d - a.sold30d || a.sku.localeCompare(b.sku));

    const onHand = skus.reduce((sum, row) => sum + row.onHand, 0);

    return {
      supplier: {
        id: supplier.id,
        name: supplier.name,
        country: supplier.country,
        email: supplier.email,
        phone: supplier.phone,
        notes: supplier.notes,
        example: supplier.example,
      },
      totals: {
        draftUnits: units.draft,
        orderedUnits: units.ordered,
        inTransitUnits: units.inTransit,
        receivedUnits: units.received,
        onHand,
        sold30d: skus.reduce((sum, row) => sum + row.sold30d, 0),
        soldPrev30d: skus.reduce((sum, row) => sum + row.soldPrev30d, 0),
        soldAll: skus.reduce((sum, row) => sum + row.soldAll, 0),
        fastSkuCount: skus.filter((row) => row.pace === 'fast').length,
        restockCount: skus.filter((row) => row.needsRestock).length,
      },
      links: supplier.products
        .map((link) => ({
          productId: link.productId,
          title: link.product.title,
          moq: link.moq,
          unitCostCents: link.unitCostCents,
          leadDays: link.leadDays,
          skuCount: link.product.variants.length,
        }))
        .sort((a, b) => a.title.localeCompare(b.title, 'en-IE')),
      purchaseOrders: supplier.purchaseOrders.map((po) => ({
        id: po.id,
        monthBucket: po.monthBucket,
        status: po.status,
        notes: po.notes,
        lines: po.lines.map((line) => ({
          id: line.id,
          sku: line.variant.sku,
          quantity: line.quantity,
          receivedQty: line.receivedQty,
        })),
        shipments: po.shipments.map((shipment) => ({
          id: shipment.id,
          status: shipment.status,
          tracking: shipment.tracking,
        })),
      })),
      skus,
    };
  }

  private daysAgo(days: number) {
    return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  }

  private async soldByVariant(variantIds: string[], from?: Date, to?: Date) {
    const sold = new Map<string, number>();
    if (!variantIds.length) return sold;
    const rows = await this.prisma.orderItem.groupBy({
      by: ['variantId'],
      where: {
        variantId: { in: variantIds },
        order: {
          status: { notIn: [OrderStatus.PENDING_PAYMENT, OrderStatus.CANCELLED] },
          ...(from || to
            ? {
                createdAt: {
                  ...(from ? { gte: from } : {}),
                  ...(to ? { lt: to } : {}),
                },
              }
            : {}),
        },
      },
      _sum: { quantity: true },
    });
    for (const row of rows) sold.set(row.variantId, row._sum.quantity ?? 0);
    return sold;
  }

  listPOs() {
    return this.prisma.purchaseOrder.findMany({
      include: { supplier: true, lines: { include: { variant: true } }, shipments: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async exportPOsCsv() {
    const pos = await this.listPOs();
    const header = ['id', 'createdAt', 'monthBucket', 'status', 'supplier', 'country', 'sku', 'quantity', 'receivedQty', 'tracking'];
    const rows = [header.join(',')];
    for (const po of pos) {
      const tracking = po.shipments.map((row) => row.tracking).filter(Boolean).join(' ');
      if (!po.lines.length) {
        rows.push(
          [
            csvCell(po.id),
            po.createdAt.toISOString(),
            csvCell(po.monthBucket),
            csvCell(po.status),
            csvCell(po.supplier.name),
            csvCell(po.supplier.country),
            '',
            '0',
            '0',
            csvCell(tracking),
          ].join(','),
        );
        continue;
      }
      for (const line of po.lines) {
        rows.push(
          [
            csvCell(po.id),
            po.createdAt.toISOString(),
            csvCell(po.monthBucket),
            csvCell(po.status),
            csvCell(po.supplier.name),
            csvCell(po.supplier.country),
            csvCell(line.variant.sku),
            String(line.quantity),
            String(line.receivedQty),
            csvCell(tracking),
          ].join(','),
        );
      }
    }
    return rows.join('\n');
  }

  calendar() {
    return this.prisma.purchaseOrder.groupBy({
      by: ['monthBucket', 'status'],
      _count: true,
    });
  }

  async suggestions() {
    const rows = (await this.stock.restockSuggestions()).filter((row) => row.location === 'warehouse');
    if (!rows.length) return [];
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: rows.map((row) => row.variantId) } },
      include: { product: { include: { supplierLinks: { include: { supplier: true } } } } },
    });
    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    return rows.map((row) => {
      const variant = byId.get(row.variantId);
      const link = variant?.product.supplierLinks[0];
      return {
        ...row,
        size: variant?.size ?? '',
        color: variant?.color ?? '',
        supplierId: link?.supplierId ?? null,
        supplierName: link?.supplier.name ?? null,
        moq: link?.moq ?? 1,
        unitCostCents: link?.unitCostCents ?? variant?.costCents ?? 0,
        suggestedQty: suggestedBuyQty(row.onHand, row.inbound, row.reorderPoint),
      };
    });
  }

  async catalog() {
    const rows = await this.prisma.product.findMany({
      select: {
        id: true,
        title: true,
        variants: { select: { costCents: true } },
      },
      orderBy: { title: 'asc' },
    });
    return rows.map((row) => ({
      id: row.id,
      title: row.title,
      skuCount: row.variants.length,
      defaultCostCents: row.variants[0]?.costCents ?? 0,
    }));
  }

  async createSupplier(body: unknown, actorId: string) {
    const dto = supplierCreateSchema.parse(body);
    const supplier = await this.prisma.supplier.create({
      data: {
        name: dto.name,
        country: dto.country,
        email: dto.email?.trim() || null,
        phone: dto.phone?.trim() || null,
        notes: dto.notes?.trim() || null,
        example: false,
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'supplier.create', entity: 'Supplier', entityId: supplier.id },
    });
    return supplier;
  }

  async patchSupplier(id: string, body: unknown, actorId: string) {
    const dto = supplierPatchSchema.parse(body);
    const current = await this.prisma.supplier.findUnique({ where: { id } });
    if (!current) throw new NotFoundException();
    const supplier = await this.prisma.supplier.update({
      where: { id },
      data: {
        ...dto,
        email: dto.email === undefined ? undefined : dto.email?.trim() || null,
        phone: dto.phone === undefined ? undefined : dto.phone?.trim() || null,
        notes: dto.notes === undefined ? undefined : dto.notes?.trim() || null,
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'supplier.update', entity: 'Supplier', entityId: id },
    });
    return supplier;
  }

  async linkProduct(supplierId: string, body: unknown, actorId: string) {
    const dto = supplierProductLinkSchema.parse(body);
    const supplier = await this.prisma.supplier.findUnique({ where: { id: supplierId } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
      include: { variants: { select: { id: true } } },
    });
    if (!product) throw new NotFoundException('Product not found');
    if (!product.variants.length) throw new BadRequestException('Add a SKU to this product before linking it.');
    const existing = await this.prisma.supplierProduct.findUnique({
      where: { supplierId_productId: { supplierId, productId: dto.productId } },
    });
    if (existing) throw new BadRequestException('This style is already linked to this mill.');
    const link = await this.prisma.supplierProduct.create({
      data: {
        supplierId,
        productId: dto.productId,
        moq: dto.moq ?? 1,
        unitCostCents: dto.unitCostCents,
        leadDays: dto.leadDays ?? 21,
      },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'supplier.product.link', entity: 'SupplierProduct', entityId: link.id },
    });
    return link;
  }

  async patchProductLink(supplierId: string, productId: string, body: unknown, actorId: string) {
    const dto = supplierProductPatchSchema.parse(body);
    const current = await this.prisma.supplierProduct.findUnique({
      where: { supplierId_productId: { supplierId, productId } },
    });
    if (!current) throw new NotFoundException('This style is not linked to this mill.');
    const link = await this.prisma.supplierProduct.update({
      where: { id: current.id },
      data: dto,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'supplier.product.update', entity: 'SupplierProduct', entityId: link.id },
    });
    return link;
  }

  async unlinkProduct(supplierId: string, productId: string, actorId: string) {
    const current = await this.prisma.supplierProduct.findUnique({
      where: { supplierId_productId: { supplierId, productId } },
    });
    if (!current) throw new NotFoundException('This style is not linked to this mill.');
    await this.prisma.supplierProduct.delete({ where: { id: current.id } });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'supplier.product.unlink', entity: 'SupplierProduct', entityId: current.id },
    });
    return { ok: true };
  }

  async createPurchaseOrder(body: unknown, actorId: string) {
    const dto = purchaseOrderCreateSchema.parse(body);
    const supplier = await this.requireSupplier(dto.supplierId);
    const prepared = await this.preparePoLines(supplier, dto.lines);

    return this.prisma.$transaction(async (tx) => {
      const po = await tx.purchaseOrder.create({
        data: {
          supplierId: supplier.id,
          monthBucket: dto.monthBucket || monthBucketNow(),
          notes: dto.notes?.trim() || null,
          status: PurchaseOrderStatus.DRAFT,
          lines: { create: prepared },
        },
        include: this.poInclude,
      });
      await tx.auditLog.create({
        data: { actorId, action: 'po.create', entity: 'PurchaseOrder', entityId: po.id },
      });
      return po;
    });
  }

  async getPurchaseOrder(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({
      where: { id },
      include: this.poInclude,
    });
    if (!po) throw new NotFoundException('Purchase order not found');
    return po;
  }

  async updatePurchaseOrder(id: string, body: unknown, actorId: string) {
    const dto = purchaseOrderPatchSchema.parse(body);
    const current = await this.requireDraft(id);
    const supplier = await this.requireSupplier(current.supplierId);
    const prepared = await this.preparePoLines(supplier, dto.lines);

    return this.prisma.$transaction(async (tx) => {
      await tx.purchaseOrderLine.deleteMany({ where: { purchaseOrderId: id } });
      const po = await tx.purchaseOrder.update({
        where: { id },
        data: {
          notes: dto.notes === undefined ? undefined : dto.notes.trim() || null,
          lines: { create: prepared },
        },
        include: this.poInclude,
      });
      await tx.auditLog.create({
        data: { actorId, action: 'po.update', entity: 'PurchaseOrder', entityId: id },
      });
      return po;
    });
  }

  async cancelPurchaseOrder(id: string, actorId: string) {
    await this.requireDraft(id);
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.CANCELLED },
      include: this.poInclude,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.cancel', entity: 'PurchaseOrder', entityId: id },
    });
    return po;
  }

  async markOrdered(id: string, actorId: string) {
    await this.requireDraft(id);
    const po = await this.prisma.purchaseOrder.update({
      where: { id },
      data: { status: PurchaseOrderStatus.ORDERED, orderedAt: new Date() },
      include: this.poInclude,
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.ordered', entity: 'PurchaseOrder', entityId: id },
    });
    return po;
  }

  private poInclude = {
    supplier: true,
    lines: { include: { variant: true } },
    shipments: true,
  } as const;

  private async requireSupplier(id: string) {
    const supplier = await this.prisma.supplier.findUnique({ where: { id } });
    if (!supplier) throw new NotFoundException('Supplier not found');
    return supplier;
  }

  private async requireDraft(id: string) {
    const po = await this.prisma.purchaseOrder.findUnique({ where: { id } });
    if (!po) throw new NotFoundException('Purchase order not found');
    if (po.status !== PurchaseOrderStatus.DRAFT) {
      throw new BadRequestException('Only a draft purchase order can be changed.');
    }
    return po;
  }

  private async preparePoLines(
    supplier: { id: string; name: string },
    raw: { variantId: string; quantity: number; unitCostCents?: number }[],
  ) {
    const lines = mergePoLines(raw);
    const variants = await this.prisma.productVariant.findMany({
      where: { id: { in: lines.map((line) => line.variantId) } },
      include: { product: { include: { supplierLinks: true } } },
    });
    if (variants.length !== lines.length) throw new BadRequestException('One or more SKUs were not found');

    const byId = new Map(variants.map((variant) => [variant.id, variant]));
    const productQty = new Map<string, { title: string; moq: number; qty: number }>();
    const prepared = lines.map((line) => {
      const variant = byId.get(line.variantId);
      if (!variant) throw new BadRequestException('One or more SKUs were not found');
      const link = variant.product.supplierLinks.find((row) => row.supplierId === supplier.id);
      if (!link) throw new BadRequestException(`${variant.sku} is not sold by ${supplier.name}`);
      const acc = productQty.get(variant.productId) ?? { title: variant.product.title, moq: link.moq, qty: 0 };
      acc.qty += line.quantity;
      productQty.set(variant.productId, acc);
      return {
        variantId: line.variantId,
        quantity: line.quantity,
        unitCostCents: line.unitCostCents ?? link.unitCostCents,
      };
    });

    for (const row of productQty.values()) {
      if (row.qty < row.moq) {
        throw new BadRequestException(`Order at least ${row.moq} of ${row.title} (minimum order).`);
      }
    }
    return prepared;
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

  async receiveShipment(id: string, actorId: string, body?: unknown) {
    const parsed = receiveShipmentSchema.parse(body && typeof body === 'object' && !Array.isArray(body) ? body : {});
    const shipment = await this.prisma.inboundShipment.findUnique({
      where: { id },
      include: { purchaseOrder: { include: { lines: true } } },
    });
    if (!shipment) throw new NotFoundException();
    const requested = parsed.lines ? new Map(parsed.lines.map((row) => [row.lineId, row.quantity])) : null;
    if (requested) {
      for (const lineId of requested.keys()) {
        if (!shipment.purchaseOrder.lines.some((line) => line.id === lineId)) {
          throw new BadRequestException('Receive quantities must match lines on this purchase order.');
        }
      }
    }
    let remainingOpen = 0;
    for (const line of shipment.purchaseOrder.lines) {
      const remaining = line.quantity - line.receivedQty;
      const qty = requested ? (requested.get(line.id) ?? 0) : remaining;
      if (qty > remaining) {
        throw new BadRequestException(`Cannot receive more than the open quantity for ${line.id}.`);
      }
      remainingOpen += remaining - qty;
      if (qty <= 0) continue;
      await this.stock.receive({
        variantId: line.variantId,
        quantity: qty,
        refId: shipment.id,
        note: `PO ${shipment.purchaseOrderId}`,
      });
      await this.prisma.purchaseOrderLine.update({
        where: { id: line.id },
        data: { receivedQty: line.receivedQty + qty },
      });
    }
    const complete = remainingOpen <= 0;
    await this.prisma.inboundShipment.update({
      where: { id },
      data: complete
        ? { status: InboundShipmentStatus.RECEIVED, receivedAt: new Date() }
        : { status: InboundShipmentStatus.IN_TRANSIT },
    });
    await this.prisma.purchaseOrder.update({
      where: { id: shipment.purchaseOrderId },
      data: { status: complete ? PurchaseOrderStatus.RECEIVED : PurchaseOrderStatus.PARTIALLY_RECEIVED },
    });
    await this.prisma.auditLog.create({
      data: { actorId, action: 'po.receive', entity: 'InboundShipment', entityId: id },
    });
    return { ok: true, complete };
  }
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
