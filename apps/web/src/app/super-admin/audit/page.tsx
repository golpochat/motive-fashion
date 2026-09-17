'use client';

import { useState } from 'react';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';

type AuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  meta?: unknown;
};

export default function SuperAdminAudit() {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const params = new URLSearchParams();
  if (entity.trim()) params.set('entity', entity.trim());
  if (action.trim()) params.set('action', action.trim());
  const query = params.toString();
  const { data, loading, error, reload } = useConsoleQuery<AuditRow[]>(
    `/admin/audit${query ? `?${query}` : ''}`,
    'Could not load the audit log',
  );
  const rows = data ?? [];

  return (
    <div>
      <PageHeader title="Audit" description="Writes from catalog, stock, orders, RBAC, procurement, and WhatsApp. Newest first." />
      <form
        className="mb-4 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          reload();
        }}
      >
        <Field label="Entity">
          <input className={fieldClass} value={entity} onChange={(e) => setEntity(e.target.value)} placeholder="Order" />
        </Field>
        <Field label="Action contains">
          <input className={fieldClass} value={action} onChange={(e) => setAction(e.target.value)} placeholder="refund" />
        </Field>
        <div className="flex items-end">
          <SecondaryButton type="submit">Filter</SecondaryButton>
        </div>
      </form>
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No audit rows"
        emptyBody="Admin writes will appear here."
      >
        <DataTable headers={['When', 'Action', 'Entity', 'Actor']}>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td muted>{new Date(row.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
              <Td>{row.action}</Td>
              <Td muted>
                {row.entity}
                <span className="mt-1 block font-mono text-xs">{row.entityId.slice(0, 8)}</span>
              </Td>
              <Td muted>{row.actorId ? row.actorId.slice(0, 8) : '—'}</Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
