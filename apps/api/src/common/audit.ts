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
