import { Body, Controller, Get, Headers, Inject, Param, Post, Req, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { SquarePosAdapter } from './square.adapter';
import { posSaleSchema } from '@motive-fashion/validation';
import { PrismaService } from '../../prisma/prisma.service';
import { isProduction } from '../../common/security-config';
import { requestRawBody, squareSignatureValid } from '../../common/webhook-signature';

@Controller()
export class PosController {
  constructor(
    @Inject(SquarePosAdapter) private readonly square: SquarePosAdapter,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Post('channels/pos/sales')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  sale(@Body() body: unknown) {
    return this.square.onSale(posSaleSchema.parse(body));
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
  print(@Param('orderId') orderId: string) {
    return this.square.printReceipt(orderId);
  }

  @Get('admin/pos/devices')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('pos.sale')
  devices() {
    return this.prisma.posDevice.findMany({ include: { location: true } });
  }
}
