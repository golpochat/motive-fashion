import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { writeAudit, listAuditLogs, exportAuditCsv } from '../../common/audit';
import { CATALOG_KEYS, hasAll, HIDDEN_ROLE_SLUG, isCommerceAdminKeys, isLockedPermission, lastCommerceAdminBlocked, LOCKED_PERMISSION_KEYS, PERMISSION_CATALOG, ROLE_PERMISSIONS, slugifyRole, SYSTEM_ROLE_SLUGS, systemRoleRequiredKeys } from './permissions';
import { mixedConsoleMessage } from '@motive-fashion/utils';

const SYSTEM_ROLE_NAMES: Record<(typeof SYSTEM_ROLE_SLUGS)[number], string> = {
  'super-admin': 'Super admin',
  admin: 'Admin',
  staff: 'Staff',
  customer: 'Customer',
};

@Injectable()
export class RbacService implements OnModuleInit {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  async onModuleInit() {
    await this.syncCatalog();
  }

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
      const name = SYSTEM_ROLE_NAMES[slug];
      const role = await this.prisma.role.upsert({
        where: { slug },
        create: { slug, name, system: true, description: `System ${name} role` },
        update: { system: true, name },
      });
      const keys = ROLE_PERMISSIONS[slug];
      const grantCount = await this.prisma.rolePermission.count({ where: { roleId: role.id } });
      if (slug === HIDDEN_ROLE_SLUG || grantCount === 0) {
        await this.prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
        await this.prisma.rolePermission.createMany({
          data: keys
            .map((key) => byKey.get(key)?.id)
            .filter((id): id is string => Boolean(id))
            .map((permissionId) => ({ roleId: role.id, permissionId })),
        });
        continue;
      }
      await this.prisma.rolePermission.createMany({
        data: keys
          .map((key) => byKey.get(key)?.id)
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
      if (slug === 'admin') {
        const staffDash = byKey.get('dashboard.staff');
        if (staffDash) {
          await this.prisma.rolePermission.deleteMany({
            where: { roleId: role.id, permissionId: staffDash.id },
          });
        }
      }
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
        members: { include: { user: { select: { id: true, name: true, email: true } } } },
        _count: { select: { members: true } },
      },
    });
    if (!role || role.slug === HIDDEN_ROLE_SLUG) throw new NotFoundException();
    return role;
  }

  /** Prisma has no SUPER_ADMIN enum. Access-control principals still store ADMIN. Commerce checks use keys. */
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

  async listPermissions() {
    const rows = await this.prisma.permission.findMany({
      where: { key: { notIn: [...LOCKED_PERMISSION_KEYS] } },
      include: { grants: { include: { role: { select: { id: true, slug: true, name: true } } } } },
      orderBy: [{ group: 'asc' }, { key: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      key: row.key,
      name: row.name,
      group: row.group,
      builtin: CATALOG_KEYS.has(row.key),
      roles: row.grants.map((g) => g.role).filter((role) => role.slug !== HIDDEN_ROLE_SLUG),
    }));
  }

  listRoles() {
    return this.prisma.role.findMany({
      where: { slug: { not: HIDDEN_ROLE_SLUG } },
      include: {
        permissions: { include: { permission: true } },
        _count: { select: { members: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createRole(input: { slug?: string; name: string; description?: string; permissionKeys: string[] }, actorId: string) {
    const slug = slugifyRole(input.slug || input.name);
    if (!slug) throw new BadRequestException('Enter a role name.');
    if ((SYSTEM_ROLE_SLUGS as readonly string[]).includes(slug) || slug === HIDDEN_ROLE_SLUG) {
      throw new BadRequestException('That name is reserved.');
    }
    const keys = await this.assignableKeys(input.permissionKeys);
    try {
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
    } catch (err) {
      if (typeof err === 'object' && err && 'code' in err && (err as { code: string }).code === 'P2002') {
        throw new BadRequestException('A role with that name already exists.');
      }
      throw err;
    }
  }

  async updateRole(id: string, input: { name?: string; description?: string; permissionKeys?: string[] }, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role || role.slug === HIDDEN_ROLE_SLUG) throw new NotFoundException();
    if (role.system && input.permissionKeys && role.slug === HIDDEN_ROLE_SLUG) {
      throw new ForbiddenException('Cannot change super-admin permissions');
    }
    if (input.name || input.description !== undefined) {
      await this.prisma.role.update({
        where: { id },
        data: { name: input.name, description: input.description },
      });
    }
    if (input.permissionKeys && role.slug !== HIDDEN_ROLE_SLUG) {
      const keys = await this.assignableKeys(input.permissionKeys);
      const required = systemRoleRequiredKeys(role.slug);
      const missing = required.filter((key) => !keys.includes(key));
      if (missing.length) {
        throw new BadRequestException(`The ${role.name} role must keep ${missing.join(', ')}.`);
      }
      await this.assertKeepsCommerceAdmin(id, keys);
      await this.replacePermissions(id, keys);
    }
    await writeAudit(this.prisma, { actorId, action: 'rbac.role.update', entity: 'Role', entityId: id });
    const members = await this.prisma.userMembership.findMany({ where: { roleId: id } });
    for (const m of members) await this.syncUserEnum(m.userId);
    return this.prisma.role.findUniqueOrThrow({
      where: { id },
      include: { permissions: { include: { permission: true } } },
    });
  }

  async cloneRole(id: string, actorId: string) {
    const role = await this.getRole(id);
    const permissionKeys = role.permissions.map((g) => g.permission.key).filter((key) => !isLockedPermission(key));
    for (let n = 1; n <= 20; n += 1) {
      const suffix = n === 1 ? ' copy' : ` copy ${n}`;
      try {
        return await this.createRole(
          { name: `${role.name}${suffix}`, description: role.description, permissionKeys },
          actorId,
        );
      } catch (err) {
        if (err instanceof BadRequestException && String(err.message).includes('already exists')) continue;
        throw err;
      }
    }
    throw new BadRequestException('Could not clone this role.');
  }

  async deleteRole(id: string, actorId: string) {
    const role = await this.prisma.role.findUnique({ where: { id } });
    if (!role || role.slug === HIDDEN_ROLE_SLUG) throw new NotFoundException();
    if (role.system) throw new ForbiddenException('System roles cannot be deleted');
    await this.assertKeepsCommerceAdmin(id, []);
    const members = await this.prisma.userMembership.findMany({ where: { roleId: id } });
    await this.prisma.role.delete({ where: { id } });
    for (const m of members) await this.syncUserEnum(m.userId);
    await writeAudit(this.prisma, { actorId, action: 'rbac.role.delete', entity: 'Role', entityId: id });
    return { ok: true };
  }

  async listUsers() {
    return this.prisma.user.findMany({
      where: {
        deletedAt: null,
        memberships: { none: { role: { slug: HIDDEN_ROLE_SLUG } } },
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        mfaEnabled: true,
        emailVerified: true,
        memberships: { include: { role: { select: { id: true, slug: true, name: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }

  async setUserRoles(userId: string, roleIds: string[], actorId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new NotFoundException();
    const isPlatformAdmin = await this.prisma.userMembership.findFirst({
      where: { userId, role: { slug: HIDDEN_ROLE_SLUG } },
    });
    if (isPlatformAdmin) throw new ForbiddenException('The platform super-admin cannot be changed from here.');
    const roles = await this.prisma.role.findMany({
      where: { id: { in: roleIds } },
      include: { permissions: { include: { permission: true } } },
    });
    if (roleIds.length && roles.length !== roleIds.length) throw new BadRequestException('Unknown role');
    if (roles.some((role) => role.slug === HIDDEN_ROLE_SLUG)) {
      throw new ForbiddenException('The super-admin role cannot be assigned.');
    }
    const nextIds = roleIds.length
      ? roleIds
      : [(await this.prisma.role.findUniqueOrThrow({ where: { slug: 'customer' } })).id];
    const nextRoles = roleIds.length
      ? roles
      : await this.prisma.role.findMany({
          where: { id: { in: nextIds } },
          include: { permissions: { include: { permission: true } } },
        });
    const currentlyAdmin = isCommerceAdminKeys(await this.permissionsFor(userId));
    const nextKeys = new Set<string>();
    for (const role of nextRoles) {
      for (const grant of role.permissions) nextKeys.add(grant.permission.key);
    }
    const mix = mixedConsoleMessage([...nextKeys]);
    if (mix) throw new BadRequestException(mix);
    const otherAdmins = await this.countVisibleCommerceAdmins(userId);
    if (lastCommerceAdminBlocked(currentlyAdmin, isCommerceAdminKeys([...nextKeys]), otherAdmins)) {
      throw new BadRequestException('Assign Admin to someone else first. The shop cannot lose its last commerce admin.');
    }
    await this.prisma.userMembership.deleteMany({ where: { userId } });
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
        mfaEnabled: true,
        emailVerified: true,
        memberships: { include: { role: { select: { id: true, slug: true, name: true } } } },
      },
    });
  }

  async exportAccessCsv() {
    const [roles, people, perms] = await Promise.all([this.listRoles(), this.listUsers(), this.listPermissions()]);
    const lines = [['section', 'key', 'value']];
    for (const role of roles) {
      lines.push([
        'role',
        csvCell(role.slug),
        `${csvCell(role.name)}|${role.system ? 'system' : 'custom'}|${role._count.members}|${role.permissions.map((g) => g.permission.key).join(' ')}`,
      ]);
    }
    for (const person of people) {
      lines.push([
        'person',
        csvCell(person.email),
        `${csvCell(person.name)}|${person.memberships.map((m) => m.role.slug).join(' ')}|${person.mfaEnabled ? 'mfa' : 'no-mfa'}`,
      ]);
    }
    for (const perm of perms) {
      lines.push([
        'permission',
        csvCell(perm.key),
        `${csvCell(perm.name)}|${csvCell(perm.group)}|${perm.roles.map((role) => role.slug).join(' ')}`,
      ]);
    }
    return `${lines.map((row) => row.join(',')).join('\n')}\n`;
  }

  listAudit(query: { entity?: string; action?: string; cursor?: string }) {
    return listAuditLogs(this.prisma, { ...query, scope: 'access' });
  }

  exportAudit() {
    return exportAuditCsv(this.prisma, { scope: 'access' });
  }

  async createPermission(input: { key: string; name: string; group: string }, actorId: string) {
    const key = input.key.trim().toLowerCase();
    if (isLockedPermission(key) || CATALOG_KEYS.has(key)) {
      throw new BadRequestException('That permission key is reserved.');
    }
    const existing = await this.prisma.permission.findUnique({ where: { key } });
    if (existing) throw new BadRequestException('That permission key already exists.');
    const row = await this.prisma.permission.create({
      data: { key, name: input.name.trim(), group: input.group.trim() },
    });
    await writeAudit(this.prisma, {
      actorId,
      action: 'rbac.permission.create',
      entity: 'Permission',
      entityId: row.id,
      meta: { key },
    });
    return row;
  }

  async updatePermission(id: string, input: { name?: string; group?: string }, actorId: string) {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    if (!row || isLockedPermission(row.key)) throw new NotFoundException();
    const next = await this.prisma.permission.update({
      where: { id },
      data: { name: input.name?.trim(), group: input.group?.trim() },
    });
    await writeAudit(this.prisma, { actorId, action: 'rbac.permission.update', entity: 'Permission', entityId: id });
    return next;
  }

  async deletePermission(id: string, actorId: string) {
    const row = await this.prisma.permission.findUnique({ where: { id } });
    if (!row || isLockedPermission(row.key)) throw new NotFoundException();
    if (CATALOG_KEYS.has(row.key)) {
      throw new ForbiddenException('Built-in permissions cannot be deleted.');
    }
    await this.prisma.permission.delete({ where: { id } });
    await writeAudit(this.prisma, { actorId, action: 'rbac.permission.delete', entity: 'Permission', entityId: id });
    return { ok: true };
  }

  private async assignableKeys(keys: string[]) {
    const wanted = [...new Set(keys.filter((key) => !isLockedPermission(key)))];
    const rows = await this.prisma.permission.findMany({ where: { key: { in: wanted } } });
    const next = rows.map((row) => row.key);
    const mix = mixedConsoleMessage(next);
    if (mix) throw new BadRequestException(mix);
    return next;
  }

  private async replacePermissions(roleId: string, keys: string[]) {
    const permissions = await this.prisma.permission.findMany({ where: { key: { in: keys } } });
    await this.prisma.rolePermission.deleteMany({ where: { roleId } });
    if (!permissions.length) return;
    await this.prisma.rolePermission.createMany({
      data: permissions.map((p) => ({ roleId, permissionId: p.id })),
    });
  }

  private async countVisibleCommerceAdmins(exceptUserId?: string) {
    return (await this.visibleUsersWithKeys(exceptUserId)).filter((row) => isCommerceAdminKeys(row.keys)).length;
  }

  private async assertKeepsCommerceAdmin(roleId: string, nextKeys: string[]) {
    const current = await this.countVisibleCommerceAdmins();
    if (current < 1) return;
    const remaining = (await this.visibleUsersWithKeys()).filter((row) => {
      const keys = new Set<string>();
      for (const membership of row.memberships) {
        if (membership.roleId === roleId) {
          for (const key of nextKeys) keys.add(key);
        } else {
          for (const grant of membership.role.permissions) keys.add(grant.permission.key);
        }
      }
      return isCommerceAdminKeys([...keys]);
    }).length;
    if (remaining < 1) {
      throw new BadRequestException('Assign Admin to someone else first. The shop cannot lose its last commerce admin.');
    }
  }

  private async visibleUsersWithKeys(exceptUserId?: string) {
    const users = await this.prisma.user.findMany({
      where: {
        deletedAt: null,
        ...(exceptUserId ? { id: { not: exceptUserId } } : {}),
        memberships: { none: { role: { slug: HIDDEN_ROLE_SLUG } } },
      },
      select: {
        id: true,
        memberships: {
          include: { role: { include: { permissions: { include: { permission: true } } } } },
        },
      },
    });
    return users.map((user) => {
      const keys = new Set<string>();
      for (const membership of user.memberships) {
        for (const grant of membership.role.permissions) keys.add(grant.permission.key);
      }
      return { ...user, keys: [...keys] };
    });
  }
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
