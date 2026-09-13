'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

type Customer = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
  _count?: { orders: number };
};

export default function AdminCustomers() {
  const { data, error, loading, reload } = useConsoleQuery<Customer[]>('/admin/customers', 'Could not load customers');
  const rows = data ?? [];

  return (
    <div>
      <PageHeader title="Customers" description="People with an account. Password hashes are never returned. Profile edits stay in the customer account." />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No customers"
        emptyBody="Accounts will appear here when people register."
      >
        <DataTable headers={['Name', 'Email', 'Phone', 'Orders', 'Opt-in']}>
          {rows.map((c) => (
            <tr key={c.id} className="hover:bg-ink/5">
              <Td>
                {c.name}
                <span className="mt-1 block text-xs text-ink/45">
                  {new Date(c.createdAt).toLocaleDateString('en-IE')}
                </span>
              </Td>
              <Td muted>{c.email}</Td>
              <Td muted>{c.phone ?? '—'}</Td>
              <Td>{c._count?.orders ?? 0}</Td>
              <Td muted>
                {c.marketingOptIn ? 'Email' : '—'}
                {c.whatsappOptIn ? `${c.marketingOptIn ? ' · ' : ''}WhatsApp` : ''}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
