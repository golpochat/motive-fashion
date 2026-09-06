'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

export default function AdminSuppliers() {
  const [rows, setRows] = useState<{ id: string; name: string; country: string; example: boolean }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/procurement/suppliers`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <PageHeader title="Suppliers" description="Seed contacts are examples until verified." />
      <DataTable headers={['Country', 'Name', 'Status']}>
        {rows.map((s) => (
          <tr key={s.id} className="hover:bg-ink/[0.02]">
            <Td>{s.country}</Td>
            <Td>{s.name}</Td>
            <Td muted>{s.example ? 'Example' : 'Live'}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
