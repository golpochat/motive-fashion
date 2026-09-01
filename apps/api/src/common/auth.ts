import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as { sub: string; role: UserRole; email: string };
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookie = req.cookies?.mf_access as string | undefined;
    const token = bearer ?? cookie;
    if (!token) throw new UnauthorizedException();
    try {
      req.user = this.jwt.verify(token);
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!roles?.length) return true;
    const req = ctx.switchToHttp().getRequest();
    if (!req.user) throw new UnauthorizedException();
    if (!roles.includes(req.user.role)) throw new ForbiddenException();
    return true;
  }
}

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookie = req.cookies?.mf_access as string | undefined;
    const token = bearer ?? cookie;
    if (!token) return true;
    try {
      req.user = this.jwt.verify(token);
    } catch {
      /* guest */
    }
    return true;
  }
}
