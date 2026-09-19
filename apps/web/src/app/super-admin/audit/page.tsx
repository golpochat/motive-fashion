'use client';

import { AuditLog } from '@/components/audit-log';

export default function SuperAdminAudit() {
  return (
    <AuditLog
      source="/rbac/audit"
      description="Role, permission, and assignment writes. Newest first."
      emptyBody="Access-control writes will appear here."
      entityHint="Role"
      actionHint="assign"
    />
  );
}
