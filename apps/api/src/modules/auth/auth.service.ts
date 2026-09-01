import { Injectable, UnauthorizedException, ConflictException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Response } from 'express';
import bcrypt from 'bcryptjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginInput, RegisterInput } from '@motive-fashion/validation';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async register(dto: RegisterInput) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email already registered');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 12),
        gdprConsentAt: new Date(),
      },
    });
    return this.issue(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user.id, user.email, user.role, user.name);
  }

  issue(sub: string, email: string, role: string, name: string) {
    const accessToken = this.jwt.sign({ sub, email, role });
    return { accessToken, user: { id: sub, email, role, name } };
  }

  setCookie(res: Response, token: string) {
    res.cookie('mf_access', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
  }
}
