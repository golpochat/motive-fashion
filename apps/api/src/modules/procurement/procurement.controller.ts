import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { CurrentUser, JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { ProcurementService } from './procurement.service';

@Controller('admin/procurement')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class ProcurementController {
  constructor(private readonly procurement: ProcurementService) {}

  @Get('suppliers')
  suppliers() {
    return this.procurement.suppliers();
  }

  @Get('purchase-orders')
  pos() {
    return this.procurement.listPOs();
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
