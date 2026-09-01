import { Body, Controller, Post, Res } from '@nestjs/common';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { loginSchema, registerSchema } from '@motive-fashion/validation';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = registerSchema.parse(body);
    const result = await this.auth.register(dto);
    this.auth.setCookie(res, result.accessToken);
    return result;
  }

  @Post('login')
  async login(@Body() body: unknown, @Res({ passthrough: true }) res: Response) {
    const dto = loginSchema.parse(body);
    const result = await this.auth.login(dto);
    this.auth.setCookie(res, result.accessToken);
    return result;
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    res.clearCookie('mf_access');
    return { ok: true };
  }
}
