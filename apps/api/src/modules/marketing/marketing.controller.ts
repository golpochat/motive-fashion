import { Body, Controller, Delete, Get, Header, Inject, Param, Patch, Post, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { CurrentUser, JwtAuthGuard, PermissionsGuard, RequirePermissions } from '../../common/auth';
import { PrismaService } from '../../prisma/prisma.service';
import {
  campaignCreateSchema,
  campaignPatchSchema,
  calendarItemSchema,
  calendarItemPatchSchema,
} from '@motive-fashion/validation';
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
    const campaign = await this.prisma.campaign.create({
      data: {
        name: dto.name,
        season: dto.season,
        audience: dto.audience,
        landingSlug: dto.landingSlug,
        promoCodeId: dto.promoCodeId ?? undefined,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : undefined,
        endsAt: dto.endsAt ? new Date(dto.endsAt) : undefined,
      },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'campaign.create',
      entity: 'Campaign',
      entityId: campaign.id,
    });
    return campaign;
  }

  @Patch('campaigns/:id')
  async patchCampaign(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = campaignPatchSchema.parse(body);
    const campaign = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.name !== undefined ? { name: dto.name } : {}),
        ...(dto.season !== undefined ? { season: dto.season } : {}),
        ...(dto.audience !== undefined ? { audience: dto.audience } : {}),
        ...(dto.landingSlug !== undefined ? { landingSlug: dto.landingSlug } : {}),
        ...(dto.promoCodeId !== undefined ? { promoCodeId: dto.promoCodeId } : {}),
        ...(dto.startsAt !== undefined ? { startsAt: dto.startsAt ? new Date(dto.startsAt) : null } : {}),
        ...(dto.endsAt !== undefined ? { endsAt: dto.endsAt ? new Date(dto.endsAt) : null } : {}),
      },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'campaign.update',
      entity: 'Campaign',
      entityId: id,
    });
    return campaign;
  }

  @Delete('campaigns/:id')
  async deleteCampaign(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    await this.prisma.campaign.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'campaign.delete',
      entity: 'Campaign',
      entityId: id,
    });
    return { ok: true };
  }

  @Get('calendar')
  calendar() {
    return this.prisma.contentCalendarItem.findMany({
      include: { campaign: { select: { id: true, name: true, landingSlug: true } } },
      orderBy: { publishOn: 'asc' },
    });
  }

  @Get('calendar/export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="marketing-calendar.csv"')
  async exportCalendar(@Res() res: Response) {
    const rows = await this.prisma.contentCalendarItem.findMany({
      include: { campaign: { select: { name: true } } },
      orderBy: { publishOn: 'asc' },
    });
    const header = ['publishOn', 'channel', 'published', 'campaign', 'caption'];
    const lines = [
      header.join(','),
      ...rows.map((row) =>
        [
          row.publishOn.toISOString(),
          csvCell(row.channel),
          row.published ? 'yes' : 'no',
          csvCell(row.campaign?.name ?? ''),
          csvCell(row.caption),
        ].join(','),
      ),
    ];
    res.send(lines.join('\n'));
  }

  @Post('calendar')
  async addItem(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = calendarItemSchema.parse(body);
    const item = await this.prisma.contentCalendarItem.create({
      data: {
        campaignId: dto.campaignId,
        channel: dto.channel,
        caption: dto.caption,
        assetUrl: dto.assetUrl,
        publishOn: new Date(dto.publishOn),
        published: dto.published ?? false,
      },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'calendar.create',
      entity: 'ContentCalendarItem',
      entityId: item.id,
    });
    return item;
  }

  @Patch('calendar/:id')
  async patchItem(@Param('id') id: string, @Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = calendarItemPatchSchema.parse(body);
    const item = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        ...(dto.campaignId !== undefined ? { campaignId: dto.campaignId } : {}),
        ...(dto.channel !== undefined ? { channel: dto.channel } : {}),
        ...(dto.caption !== undefined ? { caption: dto.caption } : {}),
        ...(dto.assetUrl !== undefined ? { assetUrl: dto.assetUrl } : {}),
        ...(dto.publishOn !== undefined ? { publishOn: new Date(dto.publishOn) } : {}),
        ...(dto.published !== undefined ? { published: dto.published } : {}),
      },
    });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'calendar.update',
      entity: 'ContentCalendarItem',
      entityId: id,
    });
    return item;
  }

  @Delete('calendar/:id')
  async deleteItem(@Param('id') id: string, @CurrentUser() user: { sub: string }) {
    await this.prisma.contentCalendarItem.delete({ where: { id } });
    await writeAudit(this.prisma, {
      actorId: user.sub,
      action: 'calendar.delete',
      entity: 'ContentCalendarItem',
      entityId: id,
    });
    return { ok: true };
  }

  @Post('email/abandoned-cart')
  abandoned() {
    return { queued: false, flow: 'abandoned_cart', message: 'Email provider is not wired' };
  }
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
