import { Body, Controller, Inject, Post, Req, Res } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema, forgotPasswordSchema, resetPasswordSchema } from '@motive-fashion/validation';

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = registerSchema.parse(body);
    const result = await this.auth.register(dto);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = loginSchema.parse(body);
    const result = await this.auth.login(dto);
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
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
    this.auth.setAuthCookies(res, result.accessToken, result.refreshToken);
    return result;
  }
}
