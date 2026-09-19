'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Field, JobCard, Td, fieldClass } from '@/components/dashboard-ui';

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
  const [q, setQ] = useState('');
  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter(
      (row) =>
        row.name.toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        (row.phone ?? '').toLowerCase().includes(needle),
    );
  }, [q, rows]);

  return (
    <div>
      <PageHeader
        title="Customers"
        description="Shoppers with an account. Open a row for orders, opt-ins, and addresses. Password hashes are never returned."
      />
      <div className="mb-4 max-w-sm">
        <Field label="Find a customer">
          <input
            className={fieldClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Name, email, or phone"
            autoComplete="off"
          />
        </Field>
      </div>
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={q.trim() ? 'No matching customers' : 'No customers'}
        emptyBody={q.trim() ? 'Try another name or email.' : 'Accounts will appear here when people register.'}
      >
        <DataTable
          headers={['Name', 'Email', 'Phone', 'Orders', 'Opt-in']}
          cards={visible.map((c) => (
            <JobCard
              key={c.id}
              href={`/admin/customers/${c.id}`}
              title={c.name}
              meta={`${c.email}${c.phone ? ` · ${c.phone}` : ''}`}
            >
              <p className="mt-2 text-sm">
                {c._count?.orders ?? 0} orders
                <span className="mt-1 block text-xs text-ink/45">
                  {c.marketingOptIn ? 'Email' : 'No email'}
                  {c.whatsappOptIn ? ' · WhatsApp' : ''}
                </span>
              </p>
            </JobCard>
          ))}
        >
          {visible.map((c) => (
            <tr key={c.id} className="hover:bg-ink/5">
              <Td>
                <Link href={`/admin/customers/${c.id}`} className="font-medium">
                  {c.name}
                </Link>
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
