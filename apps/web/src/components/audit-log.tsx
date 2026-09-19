'use client';

import { useState } from 'react';
import { API } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, JobCard, SecondaryButton, Td, fieldClass } from '@/components/dashboard-ui';

type AuditRow = {
  id: string;
  actorId: string | null;
  action: string;
  entity: string;
  entityId: string;
  createdAt: string;
  actor?: { email: string; name: string } | null;
};

export function AuditLog({
  source,
  description,
  emptyBody,
  entityHint,
  actionHint,
}: {
  source: '/rbac/audit' | '/admin/audit';
  description: string;
  emptyBody: string;
  entityHint: string;
  actionHint: string;
}) {
  const [entity, setEntity] = useState('');
  const [action, setAction] = useState('');
  const [extra, setExtra] = useState<AuditRow[]>([]);
  const [loadingMore, setLoadingMore] = useState(false);
  const params = new URLSearchParams();
  if (entity.trim()) params.set('entity', entity.trim());
  if (action.trim()) params.set('action', action.trim());
  const query = params.toString();
  const { data, loading, error, reload } = useConsoleQuery<AuditRow[]>(
    `${source}${query ? `?${query}` : ''}`,
    'Could not load the audit log',
  );
  const first = data ?? [];
  const rows = extra.length ? [...first, ...extra] : first;
  const canMore = first.length === 50 && (extra.length === 0 || extra.length % 50 === 0);

  async function loadMore() {
    const last = rows[rows.length - 1];
    if (!last) return;
    setLoadingMore(true);
    const more = new URLSearchParams(params);
    more.set('cursor', last.createdAt);
    const res = await fetch(`${API}${source}?${more.toString()}`, { credentials: 'include' });
    const payload = (await res.json().catch(() => [])) as AuditRow[];
    setLoadingMore(false);
    if (Array.isArray(payload) && payload.length) setExtra((current) => [...current, ...payload]);
  }

  async function exportCsv() {
    const res = await fetch(`${API}${source}/export`, { credentials: 'include' });
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'audit.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <PageHeader
        title="Audit"
        description={description}
        actions={
          <SecondaryButton type="button" onClick={exportCsv}>
            Export CSV
          </SecondaryButton>
        }
      />
      <form
        className="mb-4 flex flex-wrap gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          setExtra([]);
          reload();
        }}
      >
        <Field label="Entity">
          <input className={fieldClass} value={entity} onChange={(e) => setEntity(e.target.value)} placeholder={entityHint} />
        </Field>
        <Field label="Action contains">
          <input className={fieldClass} value={action} onChange={(e) => setAction(e.target.value)} placeholder={actionHint} />
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
        emptyBody={emptyBody}
      >
        <DataTable
          headers={['When', 'Action', 'Entity', 'Actor']}
          cards={rows.map((row) => (
            <JobCard
              key={row.id}
              title={row.action}
              meta={`${new Date(row.createdAt).toLocaleString('en-IE', { hour12: false })} · ${row.actor?.email ?? row.actorId?.slice(0, 8) ?? '—'}`}
            >
              <p className="mt-2 text-xs text-ink/55">
                {row.entity} · {row.entityId.slice(0, 8)}
              </p>
            </JobCard>
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td muted>{new Date(row.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
              <Td>{row.action}</Td>
              <Td muted>
                {row.entity}
                <span className="mt-1 block font-mono text-xs">{row.entityId.slice(0, 8)}</span>
              </Td>
              <Td muted>{row.actor?.email ?? (row.actorId ? row.actorId.slice(0, 8) : '—')}</Td>
            </tr>
          ))}
        </DataTable>
        {first.length === 50 ? (
          <div className="mt-4">
            <SecondaryButton type="button" disabled={loadingMore || !canMore} onClick={() => void loadMore()}>
              {loadingMore ? 'Loading…' : 'Load more'}
            </SecondaryButton>
          </div>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
