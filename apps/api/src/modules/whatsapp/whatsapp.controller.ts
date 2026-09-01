import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { WhatsappService } from './whatsapp.service';

@Controller()
export class WhatsappController {
  constructor(private readonly wa: WhatsappService) {}

  @Get('webhooks/whatsapp')
  verify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') token: string,
    @Query('hub.challenge') challenge: string,
  ) {
    return this.wa.verify(mode, token, challenge) ?? 'forbidden';
  }

  @Post('webhooks/whatsapp')
  inbound(@Body() body: Parameters<WhatsappService['inbound']>[0]) {
    return this.wa.inbound(body);
  }

  @Post('admin/whatsapp/broadcast')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  broadcast(@Body() body: { message: string; template?: string }) {
    return this.wa.broadcast(body.message, body.template ?? 'broadcast');
  }
}
