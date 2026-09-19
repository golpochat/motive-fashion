'use client';

import { AuditLog } from '@/components/audit-log';

export default function AdminAudit() {
  return (
    <AuditLog
      source="/admin/audit"
      description="Catalogue, stock, orders, checkout, procurement, marketing, and WhatsApp. Newest first."
      emptyBody="Commerce writes will appear here."
      entityHint="Order"
      actionHint="refund"
    />
  );
}
