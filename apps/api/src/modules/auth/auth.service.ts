import { Injectable, UnauthorizedException, ConflictException, Inject, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginInput, RegisterInput } from '@motive-fashion/validation';
import { authCookieOptions } from '../../common/http';
import { MailService } from '../../common/mail.service';

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function safeResetNext(next?: string) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return false;
  const path = next.split('?')[0] ?? '';
  return (
    path.startsWith('/super-admin') ||
    path.startsWith('/admin') ||
    path.startsWith('/staff') ||
    path.startsWith('/user') ||
    path === '/checkout' ||
    path === '/cart'
  );
}

@Injectable()
export class AuthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(MailService) private readonly mail: MailService,
  ) {}

  async register(dto: RegisterInput) {
    const exists = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (exists) throw new ConflictException('Email already registered');
    if (!dto.gdprConsent) throw new BadRequestException('Consent is required');
    const user = await this.prisma.user.create({
      data: {
        email: dto.email.toLowerCase(),
        name: dto.name,
        phone: dto.phone,
        passwordHash: await bcrypt.hash(dto.password, 12),
        gdprConsentAt: new Date(),
      },
    });
    const customerRole = await this.prisma.role.findUnique({ where: { slug: 'customer' } });
    if (customerRole) {
      await this.prisma.userMembership.create({ data: { userId: user.id, roleId: customerRole.id } });
    }
    return this.issue(user.id, user.email, user.role, user.name);
  }

  async login(dto: LoginInput) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user?.passwordHash) throw new UnauthorizedException('Invalid credentials');
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    return this.issue(user.id, user.email, user.role, user.name);
  }

  async issue(sub: string, email: string, role: string, name: string) {
    const accessToken = this.jwt.sign({ sub, email, role }, { expiresIn: '15m' });
    const refreshToken = randomBytes(32).toString('hex');
    await this.prisma.refreshToken.create({
      data: {
        userId: sub,
        tokenHash: hashToken(refreshToken),
        expiresAt: new Date(Date.now() + REFRESH_MS),
      },
    });
    return { accessToken, refreshToken, user: { id: sub, email, role, name } };
  }

  async refresh(raw?: string) {
    if (!raw) throw new UnauthorizedException();
    const tokenHash = hashToken(raw);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { tokenHash, expiresAt: { gt: new Date() } },
      include: { user: true },
    });
    if (!stored || stored.user.deletedAt) throw new UnauthorizedException();
    await this.prisma.refreshToken.delete({ where: { id: stored.id } });
    return this.issue(stored.user.id, stored.user.email, stored.user.role, stored.user.name);
  }

  async logout(raw?: string) {
    if (!raw) return;
    await this.prisma.refreshToken.deleteMany({ where: { tokenHash: hashToken(raw) } });
  }

  async forgotPassword(email: string, next?: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.passwordHash && !user.deletedAt) {
      const token = this.jwt.sign(
        { sub: user.id, typ: 'pwdreset', fp: hashToken(user.passwordHash).slice(0, 16) },
        { expiresIn: '1h' },
      );
      const origin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
      const params = new URLSearchParams({ reset: token });
      if (safeResetNext(next)) params.set('next', next!);
      const url = `${origin}/account?${params.toString()}`;
      await this.mail.sendPasswordReset(user.email, url);
    }
  }

  async resetPassword(token: string, password: string) {
    let payload: { sub?: string; typ?: string; fp?: string };
    try {
      payload = this.jwt.verify(token) as { sub?: string; typ?: string; fp?: string };
    } catch {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    if (payload.typ !== 'pwdreset' || !payload.sub || !payload.fp) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.passwordHash || user.deletedAt || hashToken(user.passwordHash).slice(0, 16) !== payload.fp) {
      throw new BadRequestException('This reset link is invalid or has expired.');
    }
    const passwordHash = await bcrypt.hash(password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: user.id }, data: { passwordHash } }),
      this.prisma.refreshToken.deleteMany({ where: { userId: user.id } }),
    ]);
    return this.issue(user.id, user.email, user.role, user.name);
  }

  setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
    res.cookie('mf_access', accessToken, authCookieOptions(ACCESS_MS));
    res.cookie('mf_refresh', refreshToken, authCookieOptions(REFRESH_MS));
  }

  clearAuthCookies(res: Response) {
    res.clearCookie('mf_access', { path: '/' });
    res.clearCookie('mf_refresh', { path: '/' });
  }

  refreshFromRequest(req: Request, body?: { refreshToken?: string }) {
    return (req.cookies?.mf_refresh as string | undefined) ?? body?.refreshToken;
  }
}
