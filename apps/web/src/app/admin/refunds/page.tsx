'use client';

import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, FilterTabs, JobCard, Td } from '@/components/dashboard-ui';
import { formatEur } from '@motive-fashion/utils';
import { CHANNEL_LABEL } from '@motive-fashion/config';
import { useState } from 'react';

type RefundRow = {
  id: string;
  amountCents: number;
  reason: string;
  providerRef: string | null;
  createdAt: string;
  method: 'CASH' | 'CARD';
  order: {
    id: string;
    email: string;
    name: string;
    channel: string;
    paymentMethod: string;
    totalCents: number;
  };
};

function refLabel(row: RefundRow) {
  if (row.method === 'CASH') return 'Cash drawer';
  if (row.providerRef?.startsWith('re_')) return row.providerRef;
  if (row.providerRef?.startsWith('mock:')) return 'Test (no Stripe)';
  return row.providerRef || 'Card';
}

export default function AdminRefunds() {
  const [tab, setTab] = useState('ALL');
  const { data, loading, error, reload } = useConsoleQuery<RefundRow[]>(
    '/admin/refunds',
    'Could not load refunds',
  );
  const rows = data ?? [];
  const visible = rows.filter((row) => {
    if (tab === 'ALL') return true;
    return row.method === tab;
  });

  return (
    <div>
      <PageHeader
        title="Refunds"
        description="Cash refunds stay in Motive (hand the notes back). Card refunds also appear in Stripe as POST /v1/refunds."
      />
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Refund method"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'ALL', label: 'All' },
            { id: 'CARD', label: 'Card (Stripe)' },
            { id: 'CASH', label: 'Cash' },
          ]}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={tab === 'CASH' ? 'No cash refunds yet' : tab === 'CARD' ? 'No card refunds yet' : 'No refunds yet'}
        emptyBody="Refund from Orders, or from a till ticket. Card refunds then show here and in the Stripe sandbox log."
      >
        <DataTable
          headers={['When', 'Order', 'Method', 'Amount', 'Reason', 'Reference']}
          cards={visible.map((row) => (
            <JobCard
              key={row.id}
              href={`/admin/pack/${row.order.id}`}
              title={formatEur(row.amountCents)}
              meta={`${row.method === 'CASH' ? 'Cash' : 'Card'} · ${row.order.name}`}
            >
              <p className="mt-2 text-sm">{row.reason}</p>
              <p className="mt-1 text-xs text-ink/55">{refLabel(row)}</p>
            </JobCard>
          ))}
        >
          {visible.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td muted>{new Date(row.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
              <Td>
                <Link href={`/admin/pack/${row.order.id}`} className="font-mono text-xs">
                  {row.order.id.slice(0, 8)}
                </Link>
                <span className="mt-1 block text-xs text-ink/45">
                  {row.order.name} · {CHANNEL_LABEL[row.order.channel as keyof typeof CHANNEL_LABEL] ?? row.order.channel}
                </span>
              </Td>
              <Td muted>{row.method === 'CASH' ? 'Cash' : 'Card'}</Td>
              <Td>{formatEur(row.amountCents)}</Td>
              <Td muted>{row.reason}</Td>
              <Td muted>
                <span className="break-all font-mono text-xs">{refLabel(row)}</span>
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
