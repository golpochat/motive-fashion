import { Body, Controller, Delete, Get, Inject, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { ProcurementService } from './procurement.service';

@Controller('admin/procurement')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('procurement.write')
export class ProcurementController {
  constructor(@Inject(ProcurementService) private readonly procurement: ProcurementService) {}

  @Get('catalog')
  catalog() {
    return this.procurement.catalog();
  }

  @Get('suppliers')
  suppliers() {
    return this.procurement.suppliers();
  }

  @Get('suppliers/:id')
  supplierBoard(@Param('id') id: string) {
    return this.procurement.supplierBoard(id);
  }

  @Post('suppliers')
  createSupplier(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.procurement.createSupplier(body, user.sub);
  }

  @Patch('suppliers/:id')
  patchSupplier(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.procurement.patchSupplier(id, body, user.sub);
  }

  @Post('suppliers/:id/products')
  linkProduct(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.procurement.linkProduct(id, body, user.sub);
  }

  @Patch('suppliers/:id/products/:productId')
  patchProductLink(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @Body() body: unknown,
    @CurrentUser() user: { sub: string },
  ) {
    return this.procurement.patchProductLink(id, productId, body, user.sub);
  }

  @Delete('suppliers/:id/products/:productId')
  unlinkProduct(
    @Param('id') id: string,
    @Param('productId') productId: string,
    @CurrentUser() user: { sub: string },
  ) {
    return this.procurement.unlinkProduct(id, productId, user.sub);
  }

  @Get('purchase-orders')
  pos() {
    return this.procurement.listPOs();
  }

  @Post('purchase-orders')
  createPo(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.procurement.createPurchaseOrder(body, user.sub);
  }

  @Get('purchase-orders/:id')
  getPo(@Param('id') id: string) {
    return this.procurement.getPurchaseOrder(id);
  }

  @Patch('purchase-orders/:id')
  patchPo(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.procurement.updatePurchaseOrder(id, body, user.sub);
  }

  @Post('purchase-orders/:id/cancel')
  cancelPo(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.procurement.cancelPurchaseOrder(id, user.sub);
  }

  @Post('purchase-orders/:id/order')
  markOrdered(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.procurement.markOrdered(id, user.sub);
  }

  @Post('shipments')
  createShipment(
    @Body() body: { purchaseOrderId: string; tracking?: string },
    @CurrentUser() user: { sub: string },
  ) {
    return this.procurement.createShipment(body.purchaseOrderId, body.tracking, user.sub);
  }

  @Post('shipments/:id/receive')
  receive(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    return this.procurement.receiveShipment(id, user.sub);
  }

  @Get('calendar')
  calendar() {
    return this.procurement.calendar();
  }

  @Get('suggestions')
  suggestions() {
    return this.procurement.suggestions();
  }
}
