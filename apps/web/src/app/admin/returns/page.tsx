'use client';

import { useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, FilterTabs, PrimaryButton, SecondaryButton, Td } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type ReturnRow = {
  id: string;
  status: string;
  reason: string;
  createdAt: string;
  order: {
    id: string;
    email: string;
    name: string;
    totalCents: number;
    status: string;
  };
  items: { quantity: number; orderItem?: { title: string; sku: string } }[];
};

const NEXT: Record<string, { id: string; label: string }[]> = {
  REQUESTED: [
    { id: 'APPROVED', label: 'Approve' },
    { id: 'REJECTED', label: 'Reject' },
  ],
  APPROVED: [{ id: 'RECEIVED', label: 'Mark received' }],
  RECEIVED: [{ id: 'REFUNDED', label: 'Mark refunded' }],
};

export default function AdminReturns() {
  const { me } = useSession();
  const canPack = hasPerm(me, 'orders.pack');
  const [tab, setTab] = useState('OPEN');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const { data, loading, error: loadError, reload } = useConsoleQuery<ReturnRow[]>('/admin/returns', 'Could not load returns');
  const rows = data ?? [];
  const visible = rows.filter((row) => {
    if (tab === 'ALL') return true;
    if (tab === 'OPEN') return row.status === 'REQUESTED' || row.status === 'APPROVED' || row.status === 'RECEIVED';
    return row.status === tab;
  });

  async function setStatus(id: string, status: string) {
    setError('');
    setBusyId(id);
    const res = await fetch(`${API}/admin/returns/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => null);
    setBusyId('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not update this return.'));
      return;
    }
    reload();
  }

  return (
    <div>
      <PageHeader title="Returns" description="Approve, receive, and restock. Mark refunded also pays the customer — cash is recorded in Motive, cards go through Stripe." />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Return status"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'OPEN', label: 'Open' },
            { id: 'REQUESTED', label: 'Requested' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'RECEIVED', label: 'Received' },
            { id: 'REFUNDED', label: 'Refunded' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ALL', label: 'All' },
          ]}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={loadError}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle="No returns"
        emptyBody="Customer return requests appear here after delivery or collection."
      >
        <DataTable headers={['Order', 'Reason', 'Items', 'Status', '']}>
          {visible.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td>
                <span className="font-mono text-xs">{row.order.id.slice(0, 8)}</span>
                <span className="mt-1 block text-xs text-ink/45">
                  {row.order.name} · {row.order.email} · {formatEur(row.order.totalCents)}
                </span>
              </Td>
              <Td muted>{row.reason}</Td>
              <Td>
                {row.items.map((item, index) => (
                  <span key={`${row.id}-${index}`} className="block text-xs">
                    {item.orderItem?.title ?? 'Item'} × {item.quantity}
                  </span>
                ))}
              </Td>
              <Td muted>{row.status}</Td>
              <Td>
                {canPack ? (
                  <div className="flex flex-wrap gap-2">
                    {(NEXT[row.status] ?? []).map((action) => (
                      <SecondaryButton
                        key={action.id}
                        type="button"
                        disabled={busyId === row.id}
                        onClick={() => void setStatus(row.id, action.id)}
                      >
                        {action.label}
                      </SecondaryButton>
                    ))}
                    {row.status === 'APPROVED' ? (
                      <PrimaryButton type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, 'REFUNDED')}>
                        Receive and refund
                      </PrimaryButton>
                    ) : null}
                  </div>
                ) : null}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
