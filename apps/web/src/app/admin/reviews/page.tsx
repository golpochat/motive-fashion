'use client';

import { useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, FilterTabs, SecondaryButton, Td } from '@/components/dashboard-ui';

type ReviewRow = {
  id: string;
  rating: number;
  body: string;
  status: string;
  createdAt: string;
  user: { name: string; email: string };
  product: { title: string; slug: string };
};

export default function AdminReviews() {
  const [tab, setTab] = useState('PENDING');
  const [busyId, setBusyId] = useState('');
  const [error, setError] = useState('');
  const query = tab === 'ALL' ? '' : `?status=${tab}`;
  const { data, loading, error: loadError, reload } = useConsoleQuery<ReviewRow[]>(
    `/admin/reviews${query}`,
    'Could not load reviews',
  );
  const rows = data ?? [];

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    setBusyId(id);
    const res = await fetch(`${API}/admin/reviews/${id}`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    const payload = await res.json().catch(() => null);
    setBusyId('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not update this review.'));
      return;
    }
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Reviews"
        description="Only approved reviews appear on the product page. After a refund or return, 4–5 star reviews stay; 1–3 star reviews are unpublished."
      />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Review status"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'PENDING', label: 'Pending' },
            { id: 'APPROVED', label: 'Approved' },
            { id: 'REJECTED', label: 'Rejected' },
            { id: 'ALL', label: 'All' },
          ]}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={loadError}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No reviews"
        emptyBody="Verified buyers can submit a review after delivery. Refunded pieces keep 4–5 star reviews only."
      >
        <DataTable headers={['Product', 'Customer', 'Rating', 'Review', '']}>
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td>{row.product.title}</Td>
              <Td muted>
                {row.user.name}
                <span className="mt-1 block text-xs">{row.user.email}</span>
              </Td>
              <Td>{row.rating} / 5</Td>
              <Td muted>{row.body}</Td>
              <Td>
                {row.status === 'PENDING' ? (
                  <div className="flex flex-wrap gap-2">
                    <SecondaryButton type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, 'APPROVED')}>
                      Approve
                    </SecondaryButton>
                    <SecondaryButton type="button" disabled={busyId === row.id} onClick={() => void setStatus(row.id, 'REJECTED')}>
                      Reject
                    </SecondaryButton>
                  </div>
                ) : (
                  <span className="text-xs text-ink/45">{row.status}</span>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
