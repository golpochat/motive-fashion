'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';

export default function AdminLocations() {
  const [rows, setRows] = useState<{ id: string; code: string; name: string; type: string }[]>([]);
  useEffect(() => {
    fetch(`${API}/admin/locations`, { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : []))
      .then(setRows);
  }, []);
  return (
    <div>
      <h1 className="font-serif text-3xl">Locations</h1>
      <ul className="mt-4 text-sm">
        {rows.map((l) => (
          <li key={l.id}>
            {l.code} — {l.name} ({l.type})
          </li>
        ))}
      </ul>
    </div>
  );
}
