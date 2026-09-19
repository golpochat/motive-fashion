import type { Prisma } from '../../generated/prisma';
import type { PrismaService } from '../prisma/prisma.service';

export function writeAudit(
  prisma: PrismaService | Prisma.TransactionClient,
  data: {
    actorId?: string;
    action: string;
    entity: string;
    entityId: string;
    meta?: Prisma.InputJsonValue;
  },
) {
  return prisma.auditLog.create({ data });
}

async function actorMap(prisma: PrismaService, ids: (string | null)[]) {
  const unique = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  if (!unique.length) return new Map<string, { email: string; name: string }>();
  const users = await prisma.user.findMany({
    where: { id: { in: unique } },
    select: { id: true, email: true, name: true },
  });
  return new Map(users.map((user) => [user.id, { email: user.email, name: user.name }]));
}

export async function listAuditLogs(
  prisma: PrismaService,
  query: { entity?: string; action?: string; cursor?: string; scope?: 'access' | 'commerce' },
) {
  const logs = await prisma.auditLog.findMany({
    where: auditWhere(query),
    orderBy: { createdAt: 'desc' },
    take: 50,
  });
  const actors = await actorMap(prisma, logs.map((row) => row.actorId));
  return logs.map((row) => ({
    ...row,
    actor: row.actorId ? actors.get(row.actorId) ?? null : null,
  }));
}

export async function exportAuditCsv(
  prisma: PrismaService,
  query: { scope?: 'access' | 'commerce' } = {},
) {
  const logs = await prisma.auditLog.findMany({
    where: auditWhere(query),
    orderBy: { createdAt: 'desc' },
    take: 2000,
  });
  const actors = await actorMap(prisma, logs.map((row) => row.actorId));
  const header = ['createdAt', 'action', 'entity', 'entityId', 'actorEmail', 'actorName'];
  const lines = [
    header.join(','),
    ...logs.map((row) => {
      const actor = row.actorId ? actors.get(row.actorId) : undefined;
      const email = actor?.email ?? '';
      const name = actor?.name ?? '';
      return [
        row.createdAt.toISOString(),
        csvCell(row.action),
        csvCell(row.entity),
        csvCell(row.entityId),
        csvCell(email),
        csvCell(name),
      ].join(',');
    }),
  ];
  return `${lines.join('\n')}\n`;
}

const ACCESS_AUDIT: Prisma.AuditLogWhereInput = {
  OR: [{ entity: { in: ['Role', 'Permission'] } }, { action: { startsWith: 'rbac.' } }],
};

export function auditScopeWhere(scope?: 'access' | 'commerce'): Prisma.AuditLogWhereInput {
  if (scope === 'access') return ACCESS_AUDIT;
  if (scope === 'commerce') return { NOT: ACCESS_AUDIT };
  return {};
}

function auditWhere(query: { entity?: string; action?: string; cursor?: string; scope?: 'access' | 'commerce' }) {
  return {
    AND: [
      auditScopeWhere(query.scope),
      query.entity ? { entity: query.entity } : {},
      query.action ? { action: { contains: query.action, mode: 'insensitive' as const } } : {},
      query.cursor ? { createdAt: { lt: new Date(query.cursor) } } : {},
    ],
  };
}

function csvCell(value: string) {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}
