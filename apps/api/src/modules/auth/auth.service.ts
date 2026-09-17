import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  Inject,
  BadRequestException,
  ForbiddenException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import type { LoginInput, RegisterInput } from '@motive-fashion/validation';
import { authCookieOptions } from '../../common/http';
import { MailService } from '../../common/mail.service';
import { clearFailedLogins, isLoginLocked, recordFailedLogin } from './login-lockout';
import {
  consumeBackupCode,
  generateBackupCodes,
  hashBackupCode,
  otpauthUri,
  randomTotpSecret,
  verifyTotp,
} from './totp';
import { isStaffWorkspace, staffMfaRequired } from '../../common/security-config';

const ACCESS_MS = 15 * 60 * 1000;
const REFRESH_MS = 7 * 24 * 60 * 60 * 1000;
const LOCKED_MESSAGE = 'Too many sign-in attempts. Try again later.';

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
        emailVerified: false,
      },
    });
    const customerRole = await this.prisma.role.findUnique({ where: { slug: 'customer' } });
    if (customerRole) {
      await this.prisma.userMembership.create({ data: { userId: user.id, roleId: customerRole.id } });
    }
    await this.sendVerification(user.id, user.email);
    return { needsVerification: true as const, email: user.email };
  }

  async login(dto: LoginInput) {
    const email = dto.email.toLowerCase();
    if (await isLoginLocked(email)) {
      throw new HttpException({ message: LOCKED_MESSAGE }, HttpStatus.TOO_MANY_REQUESTS);
    }
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user?.passwordHash || user.deletedAt) {
      await this.failLogin(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    const ok = await bcrypt.compare(dto.password, user.passwordHash);
    if (!ok) {
      await this.failLogin(email);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (!user.emailVerified) {
      throw new ForbiddenException('Verify your email before signing in.');
    }
    if (user.mfaEnabled) {
      const mfaToken = this.jwt.sign({ sub: user.id, typ: 'mfa_pending' }, { expiresIn: '5m' });
      return { mfaRequired: true as const, mfaToken };
    }
    await clearFailedLogins(email);
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
    if (!stored || stored.user.deletedAt || !stored.user.emailVerified) throw new UnauthorizedException();
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
      const url = `${origin}/auth/reset?${params.toString()}`;
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
    if (!user.emailVerified) {
      await this.sendVerification(user.id, user.email);
      return { needsVerification: true as const, email: user.email };
    }
    if (user.mfaEnabled) {
      const mfaToken = this.jwt.sign({ sub: user.id, typ: 'mfa_pending' }, { expiresIn: '5m' });
      return { mfaRequired: true as const, mfaToken };
    }
    return this.issue(user.id, user.email, user.role, user.name);
  }

  async verifyEmail(token: string) {
    let payload: { sub?: string; typ?: string };
    try {
      payload = this.jwt.verify(token) as { sub?: string; typ?: string };
    } catch {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }
    if (payload.typ !== 'emailverify' || !payload.sub) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || user.deletedAt) {
      throw new BadRequestException('This verification link is invalid or has expired.');
    }
    if (!user.emailVerified) {
      await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
    }
    await clearFailedLogins(user.email);
    return this.issue(user.id, user.email, user.role, user.name);
  }

  async resendVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user?.passwordHash && !user.deletedAt && !user.emailVerified) {
      await this.sendVerification(user.id, user.email);
    }
  }

  async setupMfa(userId: string) {
    const user = await this.requireUser(userId);
    if (user.mfaEnabled) throw new BadRequestException('Authenticator is already on.');
    const secret = randomTotpSecret();
    const backupCodes = generateBackupCodes();
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaSecret: secret, mfaBackupHashes: backupCodes.map(hashBackupCode), mfaEnabled: false },
    });
    return { secret, otpauth: otpauthUri(user.email, secret), backupCodes };
  }

  async enableMfa(userId: string, code: string) {
    const user = await this.requireUser(userId);
    if (user.mfaEnabled) throw new BadRequestException('Authenticator is already on.');
    if (!user.mfaSecret || !verifyTotp(user.mfaSecret, code)) {
      throw new BadRequestException('That code is not valid. Try the current code from your authenticator.');
    }
    await this.prisma.user.update({ where: { id: user.id }, data: { mfaEnabled: true } });
    return { ok: true as const };
  }

  async disableMfa(userId: string, password: string, code: string) {
    const user = await this.requireUser(userId);
    if (!user.mfaEnabled || !user.passwordHash) throw new BadRequestException('Authenticator is not on.');
    const keys = await this.permissionKeys(userId);
    if (staffMfaRequired() && isStaffWorkspace(keys)) {
      throw new ForbiddenException('Authenticator stays on for staff and admin accounts.');
    }
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new UnauthorizedException('Invalid credentials');
    const totpOk = user.mfaSecret ? verifyTotp(user.mfaSecret, code) : false;
    const remaining = totpOk ? user.mfaBackupHashes : consumeBackupCode(user.mfaBackupHashes, code);
    if (!totpOk && !remaining) throw new BadRequestException('That code is not valid.');
    await this.prisma.user.update({
      where: { id: user.id },
      data: { mfaEnabled: false, mfaSecret: null, mfaBackupHashes: [] },
    });
    return { ok: true as const };
  }

  private async permissionKeys(userId: string) {
    const memberships = await this.prisma.userMembership.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const keys = new Set<string>();
    for (const row of memberships) {
      for (const grant of row.role.permissions) keys.add(grant.permission.key);
    }
    return [...keys];
  }

  async verifyMfa(mfaToken: string, code: string) {
    let payload: { sub?: string; typ?: string };
    try {
      payload = this.jwt.verify(mfaToken) as { sub?: string; typ?: string };
    } catch {
      throw new UnauthorizedException('This sign-in step expired. Sign in again.');
    }
    if (payload.typ !== 'mfa_pending' || !payload.sub) {
      throw new UnauthorizedException('This sign-in step expired. Sign in again.');
    }
    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user?.mfaEnabled || user.deletedAt || !user.emailVerified) {
      throw new UnauthorizedException('Invalid credentials');
    }
    const totpOk = user.mfaSecret ? verifyTotp(user.mfaSecret, code) : false;
    const remaining = totpOk ? null : consumeBackupCode(user.mfaBackupHashes, code);
    if (!totpOk && !remaining) {
      await this.failLogin(user.email);
      throw new UnauthorizedException('Invalid credentials');
    }
    if (remaining) {
      await this.prisma.user.update({ where: { id: user.id }, data: { mfaBackupHashes: remaining } });
    }
    await clearFailedLogins(user.email);
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

  private async sendVerification(userId: string, email: string) {
    const token = this.jwt.sign({ sub: userId, typ: 'emailverify' }, { expiresIn: '24h' });
    const origin = (process.env.WEB_ORIGIN ?? 'http://localhost:3000').replace(/\/$/, '');
    const url = `${origin}/auth/verify?token=${encodeURIComponent(token)}`;
    await this.mail.sendEmailVerification(email, url);
  }

  private async failLogin(email: string) {
    const locked = await recordFailedLogin(email);
    if (locked) throw new HttpException({ message: LOCKED_MESSAGE }, HttpStatus.TOO_MANY_REQUESTS);
  }

  private async requireUser(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || user.deletedAt) throw new UnauthorizedException();
    if (!user.emailVerified) throw new ForbiddenException('Verify your email before signing in.');
    return user;
  }
}
