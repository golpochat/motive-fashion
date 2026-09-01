import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { SquarePosAdapter } from './square.adapter';
import type { PosSaleInput } from './pos-adapter';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class PosController {
  constructor(
    private readonly square: SquarePosAdapter,
    private readonly prisma: PrismaService,
  ) {}

  @Post('channels/pos/sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  sale(@Body() body: PosSaleInput) {
    return this.square.onSale(body);
  }

  @Post('webhooks/square')
  async squareWebhook(@Body() body: { type?: string; event_id?: string; data?: { object?: { payment?: { id: string } } } }) {
    if (body.event_id) {
      const seen = await this.prisma.webhookEvent.findUnique({
        where: { provider_eventId: { provider: 'square', eventId: body.event_id } },
      });
      if (seen) return { duplicate: true };
      await this.prisma.webhookEvent.create({
        data: { provider: 'square', eventId: body.event_id, payload: body as object, processed: true },
      });
    }
    return { ok: true };
  }

  @Post('admin/pos/print/:orderId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  print(@Param('orderId') orderId: string) {
    return this.square.printReceipt(orderId);
  }

  @Get('admin/pos/devices')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.STAFF)
  devices() {
    return this.prisma.posDevice.findMany({ include: { location: true } });
  }
}
