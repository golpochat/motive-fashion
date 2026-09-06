'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

export default function AdminLocations() {
  const [rows, setRows] = useState<{ id: string; code: string; name: string; type: string }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/locations`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <PageHeader title="Locations" description="Warehouse, shop floor, and pop-up stock rooms." />
      <DataTable headers={['Code', 'Name', 'Type']}>
        {rows.map((l) => (
          <tr key={l.id} className="hover:bg-ink/[0.02]">
            <Td>{l.code}</Td>
            <Td>{l.name}</Td>
            <Td muted>{l.type}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
