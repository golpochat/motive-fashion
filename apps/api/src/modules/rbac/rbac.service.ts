import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { writeAudit } from '../../common/audit';
import { CATALOG_KEYS, hasAll, PERMISSION_CATALOG, ROLE_PERMISSIONS, SYSTEM_ROLE_SLUGS } from './permissions';

@Injectable()
export class RbacService {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async syncCatalog() {
    for (const row of PERMISSION_CATALOG) {
      await this.prisma.permission.upsert({
        where: { key: row.key },
        create: row,
        update: { name: row.name, group: row.group },
      });
    }
    const permissions = await this.prisma.permission.findMany();
    const byKey = new Map(permissions.map((p) => [p.key, p]));
    for (const slug of SYSTEM_ROLE_SLUGS) {
      const name = slug
        .split('-')
        .map((p) => p[0]?.toUpperCase() + p.slice(1))
        .join(' ');
      const role = await this.prisma.role.upsert({
        where: { slug },
        create: { slug, name, system: true, description: `System ${name} role` },
        update: { system: true },
      });
      const keys = ROLE_PERMISSIONS[slug];
      await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
      await this.prisma.rolePermission.createMany({
        data: keys
          .map((key) => byKey.get(key)?.id)
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
      });
    }
  }

  async permissionsFor(userId: string) {
    const memberships = await this.prisma.userMembership.findMany({
      where: { userId },
      include: { role: { include: { permissions: { include: { permission: true } } } } },
    });
    const keys = new Set<string>();
    for (const m of memberships) {
      for (const grant of m.role.permissions) keys.add(grant.permission.key);
    }
    return [...keys];
  }

  has(keys: string[], needed: string[]) {
    return hasAll(keys, needed);
  }

  async getRole(id: string) {
    const role = await this.prisma.role.findUnique({
      where: { id },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { members: true } },
      },
    });
    if (!role) throw new NotFoundException();
    return role;
  }

  enumFromPermissions(keys: string[]): UserRole {
    if (keys.includes('*') || keys.includes('dashboard.admin') || keys.includes('rbac.roles.write')) {
      return UserRole.ADMIN;
    }
    if (keys.includes('dashboard.staff') || keys.includes('pos.sale') || keys.includes('inventory.adjust')) {
      return UserRole.STAFF;
    }
    return UserRole.CUSTOMER;
  }

  async assignRoleSlug(userId: string, slug: string) {
    const role = await this.prisma.role.findUniqueOrThrow({ where: { slug } });
    await this.prisma.userMembership.upsert({
      where: { userId_roleId: { userId, roleId: role.id } },
      create: { userId, roleId: role.id },
      update: {},
    });
    await this.syncUserEnum(userId);
  }

  async syncUserEnum(userId: string) {
    const keys = await this.permissionsFor(userId);
    await this.prisma.user.update({
      where: { id: userId },
      data: { role: this.enumFromPermissions(keys) },
    });
  }

  listPermissions() {
    return this.prisma.permission.findMany({ orderBy: [{ group: 'asc' }, { key: 'asc' }] });
  }

  listRoles() {
    return this.prisma.role.findMany({
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(input: { slug: string; name: string; description?: string; permissionKeys: string[] }, actorId: string) {
    const slug = input.slug.toLowerCase().replace(/[^a-z0-9-]/g, '-');
    if ((SYSTEM_ROLE_SLUGS as readonly string[]).includes(slug)) {
      throw new BadRequestException('That slug is reserved for a system role');
    }
    const keys = input.permissionKeys.filter((k) => k !== '*' && CATALOG_KEYS.has(k));
    const role = await this.prisma.role.create({
      data: { slug, name: input.name, description: input.description ?? '', system: false },
    });
    await this.replacePermissions(role.id, keys);
    await writeAudit(this.prisma, {
      actorId,
      action: 'rbac.role.create',
      entity: 'Role',
      entityId: role.id,
      meta: { slug, keys },
    });
    return this.prisma.role.findUniqueOrThrow({
      where: { id: role.id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async updateRole(id: string, input: { name?: string; description?: string; permissionKeys?: string[] }, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException();
    if (role.system && input.permissionKeys && role.slug === 'super-admin') {
      throw new ForbiddenException('Cannot change super-admin permissions');
    }
    if (input.name || input.description !== undefined) {
      await this.prisma.role.update({
        where: { id },
        data: { name: input.name, description: input.description },
      });
    }
    if (input.permissionKeys && (!role.system || role.slug !== 'super-admin')) {
      await this.replacePermissions(
        id,
        input.permissionKeys.filter((k) => k !== '*' && CATALOG_KEYS.has(k)),
      );
    }
    await writeAudit(this.prisma, { actorId, action: 'rbac.role.update', entity: 'Role', entityId: id });
    const members = await this.prisma.userMembership.findMany({ where: { roleId: id } });
    for (const m of members) await this.syncUserEnum(m.userId);
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async deleteRole(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role) throw new NotFoundException();
    if (role.system) throw new ForbiddenException('System roles cannot be deleted');
    const members = await this.prisma.userMembership.findMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    for (const m of members) await this.syncUserEnum(m.userId);
    await writeAudit(this.prisma, { actorId, action: 'rbac.role.delete', entity: 'Role', entityId: id });
    return { ok: true };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        memberships: { include: { role: { select: { id: true, slug: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setUserRoles(userId: string, roleIds: string[], actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const roles = await this.prisma.role.findMany({ where: { id: { in: roleIds } } });
    if (roleIds.length && roles.length !== roleIds.length) throw new BadRequestException('Unknown role');
    const superRole = await this.prisma.role.findUnique({ where: { slug: 'super-admin' } });
    if (superRole) {
      const currentlySuper = await this.prisma.userMembership.findUnique({
        where: { userId_roleId: { userId, roleId: superRole.id } },
      });
      const stayingSuper = roleIds.includes(superRole.id);
      if (currentlySuper && !stayingSuper) {
        const others = await this.prisma.userMembership.count({
          where: { roleId: superRole.id, userId: { not: userId } },
        });
        if (others < 1) throw new ForbiddenException('Keep at least one super-admin');
      }
    }
    await this.prisma.userMembership.deleteMany({ where: { userId } });
    const nextIds = roleIds.length ? roleIds : [(await this.prisma.role.findUniqueOrThrow({ where: { slug: 'customer' } })).id];
    await this.prisma.userMembership.createMany({ data: nextIds.map((roleId) => ({ userId, roleId })) });
    await this.syncUserEnum(userId);
    await writeAudit(this.prisma, {
      actorId,
      action: 'rbac.user.roles',
      entity: 'User',
      entityId: userId,
      meta: { roleIds: nextIds },
    });
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        memberships: { include: { role: { select: { id: true, slug: true, name: true } } } },
      },
    });
  }

  private async replacePermissions(roleId: string, keys: string[]) {
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (!permissions.length) return;
    await this.prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId, permissionId: p.id })),
    });
  }
}
