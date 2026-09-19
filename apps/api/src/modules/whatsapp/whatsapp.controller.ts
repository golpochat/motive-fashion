import { Body, Controller, Get, Headers, Inject, Post, Query, Req, UseGuards } from '@nestjs/common';
import { Request } from 'express';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { WhatsappService } from './whatsapp.service';
import { requestRawBody } from '../../common/webhook-signature';
import { whatsappBroadcastSchema } from '@motive-fashion/validation';
import { writeAudit } from '../../common/audit';
import { PrismaService } from '../../prisma/prisma.service';

@Controller()
export class WhatsappController {
  constructor(
    @Inject(WhatsappService) private readonly wa: WhatsappService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  @Get('webhooks/whatsapp')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.wa.verify(mode, token, challenge);
  }

  @Post('webhooks/whatsapp')
  inbound(@Req() req: Request, @Headers('x-hub-signature-256') signature?: string) {
    const raw = requestRawBody(req as Request & { rawBody?: Buffer });
    this.wa.assertInboundSignature(raw, signature);
    const payload = JSON.parse(raw.toString('utf8')) as Parameters<WhatsappService['inbound']>[0];
    return this.wa.inbound(payload);
  }

  @Post('admin/whatsapp/broadcast')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp.broadcast')
  async broadcast(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = whatsappBroadcastSchema.parse(body);
    const result = await this.wa.broadcast(dto.message, dto.template ?? 'broadcast');
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'whatsapp.broadcast',
      entity: 'User',
      entityId: user.sub,
      meta: { sent: result.sent },
    });
    return result;
  }

  @Get('admin/whatsapp/sessions')
  @UseGuards(JwtAuthGuard, PermissionsGuard)
  @RequirePermissions('whatsapp.broadcast')
  sessions() {
    return Promise.all([
      this.prisma.user.count({ where: { whatsappOptIn: true, phone: { not: null }, deletedAt: null } }),
      this.prisma.whatsappSession.findMany({
        include: { messages: { orderBy: { createdAt: 'desc' }, take: 8 } },
        orderBy: { updatedAt: 'desc' },
        take: 40,
      }),
    ]).then(([optedIn, sessions]) => ({ optedIn, sessions }));
  }
}
