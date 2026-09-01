import { Body, Controller, Get, Inject, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import { campaignCreateSchema, calendarItemSchema } from '@motive-fashion/validation';
import { writeAudit } from '../../common/audit';

@Controller('admin/marketing')
@UseGuards(JwtAuthGuard, PermissionsGuard)
@RequirePermissions('marketing.write')
export class MarketingController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get('campaigns')
  campaigns() {
    return this.prisma.campaign.findMany({ include: { calendar: true }, orderBy: { createdAt: 'desc' } });
  }

  @Post('campaigns')
  async create(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = campaignCreateSchema.parse(body);
    const campaign = await this.prisma.campaign.create({ data: dto });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'campaign.create',
      entity: 'Campaign',
      entityId: campaign.id,
    });
    return campaign;
  }

  @Get('calendar')
  calendar() {
    return this.prisma.contentCalendarItem.findMany({ orderBy: { publishOn: 'asc' } });
  }

  @Post('calendar')
  async addItem(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = calendarItemSchema.parse(body);
    const item = await this.prisma.contentCalendarItem.create({
      data: { ...dto, publishOn: new Date(dto.publishOn) },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'calendar.create',
      entity: 'ContentCalendarItem',
      entityId: item.id,
    });
    return item;
  }

  @Post('email/abandoned-cart')
  abandoned() {
    return { queued: false, flow: 'abandoned_cart', message: 'Email provider is not wired' };
  }
}
