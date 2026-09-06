'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

export default function AdminProducts() {
  const [rows, setRows] = useState<{ id: string; title: string; slug: string; variants: unknown[] }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/products`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <PageHeader title="Products" description="Catalog SKUs on the Dublin ledger." />
      <DataTable headers={['Title', 'Slug', 'SKUs']}>
        {rows.map((r) => (
          <tr key={r.id} className="hover:bg-ink/[0.02]">
            <Td>{r.title}</Td>
            <Td muted>{r.slug}</Td>
            <Td>{r.variants.length}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
