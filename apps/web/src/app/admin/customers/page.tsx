'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

export default function AdminCustomers() {
  const [rows, setRows] = useState<{ id: string; email: string; name: string }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/customers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <PageHeader title="Customers" description="People with an account. Password hashes are never returned." />
      <DataTable headers={['Name', 'Email']}>
        {rows.map((c) => (
          <tr key={c.id} className="hover:bg-ink/[0.02]">
            <Td>{c.name}</Td>
            <Td muted>{c.email}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
