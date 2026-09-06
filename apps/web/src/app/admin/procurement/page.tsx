'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

export default function AdminProcurement() {
  const [pos, setPos] = useState<{ id: string; monthBucket: string; status: string; supplier: { country: string; name: string } }[]>(
    [],
  );
  useEffect(() => {
    fetch(`${API}/admin/procurement/purchase-orders`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setPos);
  }, []);
  return (
    <div>
      <PageHeader title="Procurement" description="Purchase orders by month bucket and supplier." />
      <DataTable headers={['Month', 'Supplier', 'Country', 'Status']}>
        {pos.map((p) => (
          <tr key={p.id} className="hover:bg-ink/[0.02]">
            <Td>{p.monthBucket}</Td>
            <Td>{p.supplier.name}</Td>
            <Td muted>{p.supplier.country}</Td>
            <Td>{p.status}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
