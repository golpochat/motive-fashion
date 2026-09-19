import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Inject,
  createParamDecorator,
  SetMetadata,
  ForbiddenException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { RbacService } from '../modules/rbac/rbac.service';
import { PrismaService } from '../prisma/prisma.service';
import { isStaffWorkspace, staffMfaRequired } from './security-config';
import { isCustomerPrincipal, principalWorkspace, SHOPPER_ONLY_MESSAGE, type PrincipalWorkspace } from '@motive-fashion/utils';

export const ROLES_KEY = 'roles';
export const PERMS_KEY = 'permissions';
export const WORKSPACE_KEY = 'workspace';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
export const RequirePermissions = (...perms: string[]) => SetMetadata(PERMS_KEY, perms);
export const RequireWorkspace = (...ids: PrincipalWorkspace[]) => SetMetadata(WORKSPACE_KEY, ids);

export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest();
  return req.user as { sub: string; role: UserRole; email: string; permissions?: string[] };
});

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookie = req.cookies?.mf_access as string | undefined;
    const token = bearer ?? cookie;
    if (!token) throw new UnauthorizedException();
    try {
      const payload = this.jwt.verify(token) as { typ?: string };
      if (payload.typ) throw new UnauthorizedException();
      req.user = payload;
      return true;
    } catch {
      throw new UnauthorizedException();
    }
  }
}

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(RbacService) private readonly rbac: RbacService,
    @Inject(PrismaService) private readonly prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext) {
    const handlerPerms = this.reflector.get<string[]>(PERMS_KEY, ctx.getHandler()) ?? [];
    const classPerms = this.reflector.get<string[]>(PERMS_KEY, ctx.getClass()) ?? [];
    const needed = [...new Set([...classPerms, ...handlerPerms])];
    const workspaces = this.reflector.getAllAndOverride<PrincipalWorkspace[]>(WORKSPACE_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!needed.length && !workspaces?.length) return true;
    const req = ctx.switchToHttp().getRequest();
    if (!req.user?.sub) throw new UnauthorizedException();
    const keys = await this.rbac.permissionsFor(req.user.sub);
    req.user.permissions = keys;
    if (workspaces?.length && !workspaces.includes(principalWorkspace(keys))) {
      throw new ForbiddenException();
    }
    if (needed.length && !this.rbac.has(keys, needed)) throw new ForbiddenException();
    if (staffMfaRequired() && isStaffWorkspace(keys)) {
      const user = await this.prisma.user.findUnique({
        where: { id: req.user.sub },
        select: { mfaEnabled: true },
      });
      if (!user?.mfaEnabled) {
        throw new ForbiddenException('Authenticator is required for this workspace');
      }
    }
    return true;
  }
}

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(@Inject(Reflector) private readonly reflector: Reflector) {}

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
export class ShopperGuard implements CanActivate {
  constructor(@Inject(RbacService) private readonly rbac: RbacService) {}

  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.sub as string | undefined;
    if (!userId) return true;
    const keys = await this.rbac.permissionsFor(userId);
    req.user.permissions = keys;
    if (!isCustomerPrincipal(keys)) {
      throw new ForbiddenException(SHOPPER_ONLY_MESSAGE);
    }
    return true;
  }
}

@Injectable()
export class OptionalJwtGuard implements CanActivate {
  constructor(@Inject(JwtService) private readonly jwt: JwtService) {}

  canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    const header = req.headers.authorization as string | undefined;
    const bearer = header?.startsWith('Bearer ') ? header.slice(7) : undefined;
    const cookie = req.cookies?.mf_access as string | undefined;
    const token = bearer ?? cookie;
    if (!token) return true;
    try {
      const payload = this.jwt.verify(token) as { typ?: string };
      if (!payload.typ) req.user = payload;
    } catch {
      /* guest */
    }
    return true;
  }
}
