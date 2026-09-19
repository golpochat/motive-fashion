import { Body, Controller, Get, Headers, Inject, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { SquarePosAdapter } from './square.adapter';
import { posEmailSchema, posPrintSchema, posQuoteSchema, posSaleSchema, refundSchema } from '@motive-fashion/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { isProduction } from '../../common/security-config';
import { requestRawBody, squareSignatureValid } from '../../common/webhook-signature';

function canSeeAllTills(user: { permissions?: string[]; role?: string }) {
  const keys = user.permissions ?? [];
  return keys.includes('dashboard.admin');
}

@Controller()
export class PosController {
  constructor(
    @Inject(SquarePosAdapter) private readonly square: SquarePosAdapter,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Post('channels/pos/quote')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  quote(@Body() body: unknown) {
    return this.square.quote(posQuoteSchema.parse(body));
  }

  @Post('channels/pos/sales')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  sale(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    return this.square.onSale(posSaleSchema.parse(body), user.sub);
  }

  @Get('staff/orders')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  mySales(@CurrentUser() user: { sub: string; permissions?: string[]; role?: string }) {
    return this.square.listTillOrders(user.sub, canSeeAllTills(user));
  }

  @Get('staff/orders/:id')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  mySale(@Param('id') id: string, @CurrentUser() user: { sub: string; permissions?: string[]; role?: string }) {
    return this.square.getTillOrder(id, user.sub, canSeeAllTills(user));
  }

  @Post('staff/orders/:id/print')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  printMine(@Param('id') id: string, @CurrentUser() user: { sub: string; permissions?: string[]; role?: string }) {
    return this.square.printTillOrder(id, user.sub, canSeeAllTills(user));
  }

  @Post('staff/orders/:id/email')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  emailMine(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: { sub: string; permissions?: string[]; role?: string },
  ) {
    const dto = posEmailSchema.parse(body ?? {});
    return this.square.emailTillOrder(id, user.sub, dto.email, canSeeAllTills(user));
  }

  @Post('staff/orders/:id/refund')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  refundMine(
    @Param('id') id: string,
    @Body() body: unknown,
    @CurrentUser() user: { sub: string; permissions?: string[]; role?: string },
  ) {
    const dto = refundSchema.parse(body);
    return this.square.refundTillOrder(id, user.sub, dto.amountCents, dto.reason, canSeeAllTills(user));
  }

  @Post('webhooks/square')
  async squareWebhook(
    @Req() req: Request,
    @Headers('x-square-hmacsha256-header') signature?: string,
  ) {
    const raw = requestRawBody(req as Request & { rawBody?: Buffer });
    const key = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    if (!key) {
      if (isProduction()) throw new UnauthorizedException('Square webhook is not configured');
    } else {
      const notificationUrl =
        process.env.SQUARE_WEBHOOK_NOTIFICATION_URL ??
        `http://localhost:${process.env.API_PORT ?? 4000}/api/v1/webhooks/square`;
      if (!squareSignatureValid(raw, signature, key, notificationUrl)) {
        throw new UnauthorizedException('Invalid Square signature');
      }
    }
    const body = JSON.parse(raw.toString('utf8') || '{}') as { event_id?: string };
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
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  print(@Param('orderId') orderId: string, @Body() body: unknown) {
    const cash = posPrintSchema.parse(body ?? {});
    return this.square.printReceipt(orderId, cash);
  }

  @Get('admin/pos/devices')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  devices() {
    return this.prisma.posDevice.findMany({ include: { location: true } });
  }
}
