import { Body, Controller, Inject, Post, UseGuards } from '@nestjs/common';
import { COOKIE_POLICY_VERSION } from '@motive-fashion/config';
import { cookieConsentSchema } from '@motive-fashion/validation';
import { CurrentUser, OptionalJwtGuard } from './common/auth';
import { PrismaService } from './prisma/prisma.service';

@Controller()
export class ConsentController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Post('consent')
  @UseGuards(OptionalJwtGuard)
  async record(@Body() body: unknown, @CurrentUser() user?: { sub: string }) {
    const dto = cookieConsentSchema.parse(body);
    const version = dto.version === COOKIE_POLICY_VERSION ? dto.version : COOKIE_POLICY_VERSION;
    await this.prisma.cookieConsent.create({
      data: {
        userId: user?.sub,
        sessionKey: dto.sessionKey,
        version,
        choice: dto.choice,
      },
    });
    return { ok: true as const, version };
  }
}
