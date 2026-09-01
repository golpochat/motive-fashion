import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { CampaignSeason, ContentChannel, UserRole } from '@prisma/client';
import { JwtAuthGuard, Roles, RolesGuard } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { WhatsappService } from '../whatsapp/whatsapp.service';

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN, UserRole.STAFF)
export class MarketingController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly wa: WhatsappService,
  ) {}

  @Get('campaigns')
  campaigns() {
    return this.prisma.campaign.findMany({ include: { calendar: true }, orderBy: { createdAt: 'desc' } });
  }

  @Post('campaigns')
  create(
    @Body()
    body: {
      name: string;
      season: CampaignSeason;
      audience?: string;
      landingSlug?: string;
    },
  ) {
    return this.prisma.campaign.create({ data: body });
  }

  @Get('calendar')
  calendar() {
    return this.prisma.contentCalendarItem.findMany({ orderBy: { publishOn: 'asc' } });
  }

  @Post('calendar')
  addItem(
    @Body()
    body: {
      campaignId?: string;
      channel: ContentChannel;
      caption: string;
      assetUrl?: string;
      publishOn: string;
    },
  ) {
    return this.prisma.contentCalendarItem.create({
      data: { ...body, publishOn: new Date(body.publishOn) },
    });
  }

  @Post('email/abandoned-cart')
  abandoned() {
    return { queued: true, flow: 'abandoned_cart', provider: process.env.RESEND_API_KEY ? 'resend' : 'log' };
  }

  @Post('whatsapp/broadcast')
  broadcast(@Body() body: { message: string }) {
    return this.wa.broadcast(body.message, 'marketing');
  }
}
