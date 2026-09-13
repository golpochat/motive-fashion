import { Body, Controller, Inject, Post, Req, Res, UseGuards } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import {
  loginSchema,
  registerSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  mfaCodeSchema,
  mfaVerifySchema,
  mfaDisableSchema,
} from '@motive-fashion/validation';
import { CurrentUser, JwtAuthGuard } from '../../common/auth';

function isSession(
  result: unknown,
): result is { accessToken: string; refreshToken: string } {
  return Boolean(result && typeof result === 'object' && 'accessToken' in result && 'refreshToken' in result);
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown) {
    const dto = registerSchema.parse(body);
    return this.auth.register(dto);
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = loginSchema.parse(body);
    const result = await this.auth.login(dto);
    if (isSession(result)) this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('refresh')
  async refresh(
    @Req() req: Request,
    @Body() body: { refreshToken?: string },
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.refresh(this.auth.refreshFromRequest(req, body));
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(this.auth.refreshFromRequest(req));
    this.auth.clearAuthCookies(res);
    return { ok: true };
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: unknown) {
    const dto = forgotPasswordSchema.parse(body);
    await this.auth.forgotPassword(dto.email, dto.next);
    return { ok: true };
  }

  @Post('reset-password')
  async resetPassword(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = resetPasswordSchema.parse(body);
    const result = await this.auth.resetPassword(dto.token, dto.password);
    if (isSession(result)) this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('verify-email')
  async verifyEmail(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = verifyEmailSchema.parse(body);
    const result = await this.auth.verifyEmail(dto.token);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('resend-verification')
  async resendVerification(@Body() body: unknown) {
    const dto = resendVerificationSchema.parse(body);
    await this.auth.resendVerification(dto.email);
    return { ok: true };
  }

  @Post('mfa/setup')
  @UseGuards(JwtAuthGuard)
  setupMfa(@CurrentUser() user: { sub: string }) {
    return this.auth.setupMfa(user.sub);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  enableMfa(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = mfaCodeSchema.parse(body);
    return this.auth.enableMfa(user.sub, dto.code);
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  disableMfa(@Body() body: unknown, @CurrentUser() user: { sub: string }) {
    const dto = mfaDisableSchema.parse(body);
    return this.auth.disableMfa(user.sub, dto.password, dto.code);
  }

  @Post('mfa/verify')
  async verifyMfa(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = mfaVerifySchema.parse(body);
    const result = await this.auth.verifyMfa(dto.mfaToken, dto.code);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }
}
