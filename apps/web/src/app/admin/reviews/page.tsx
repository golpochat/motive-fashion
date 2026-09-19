'use client';

import { useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, FilterTabs, IconButton, JobCard, Modal, RowActions, Td } from '@/components/dashboard-ui';

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
  const [open, setOpen] = useState<ReviewRow | null>(null);
  const query = tab === 'ALL' ? '' : `?status=${tab}`;
  const { data, loading, error: loadError, reload, setData } = useConsoleQuery<ReviewRow[]>(
    `/admin/reviews${query}`,
    'Could not load reviews',
  );
  const rows = data ?? [];

  async function setStatus(id: string, status: 'APPROVED' | 'REJECTED') {
    setError('');
    const previous = rows;
    if (tab === 'PENDING') {
      setData(rows.filter((row) => row.id !== id));
    }
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
      setData(previous);
      setError(apiErrorMessage(payload, 'Could not update this review.'));
      return;
    }
    setOpen(null);
    if (tab !== 'PENDING') reload();
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
        <DataTable
          headers={['Product', 'Customer', 'Rating', 'Review', 'Action']}
          cards={rows.map((row) => (
            <JobCard
              key={row.id}
              title={row.product.title}
              meta={`${row.user.name} · ${row.rating} / 5`}
              actions={
                row.status === 'PENDING' ? (
                  <RowActions>
                    <IconButton label="Approve review" icon="check" tone="success" disabled={busyId === row.id} onClick={() => void setStatus(row.id, 'APPROVED')} />
                    <IconButton label="Reject review" icon="x" tone="danger" disabled={busyId === row.id} onClick={() => void setStatus(row.id, 'REJECTED')} />
                  </RowActions>
                ) : undefined
              }
            >
              <p className="mt-2 line-clamp-3 text-sm text-ink/70">{row.body}</p>
              <button type="button" className="mt-2 text-xs text-ink/55 underline-offset-4 hover:underline" onClick={() => setOpen(row)}>
                Read
              </button>
            </JobCard>
          ))}
        >
          {rows.map((row) => (
            <tr key={row.id} className="hover:bg-ink/5">
              <Td>
                <Link href={`/product/${row.product.slug}`}>{row.product.title}</Link>
              </Td>
              <Td muted>
                {row.user.name}
                <span className="mt-1 block text-xs">{row.user.email}</span>
              </Td>
              <Td>{row.rating} / 5</Td>
              <Td muted>
                <button type="button" className="text-left" onClick={() => setOpen(row)}>
                  {row.body.length > 80 ? `${row.body.slice(0, 80)}…` : row.body}
                </button>
              </Td>
              <Td nowrap>
                {row.status === 'PENDING' ? (
                  <RowActions>
                    <IconButton
                      label="Approve review"
                      icon="check"
                      tone="success"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row.id, 'APPROVED')}
                    />
                    <IconButton
                      label="Reject review"
                      icon="x"
                      tone="danger"
                      disabled={busyId === row.id}
                      onClick={() => void setStatus(row.id, 'REJECTED')}
                    />
                  </RowActions>
                ) : (
                  <span className="text-xs text-ink/45">{row.status}</span>
                )}
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
      {open ? (
        <Modal title={open.product.title} onClose={() => setOpen(null)}>
          <p className="text-sm">
            {open.user.name} · {open.rating} / 5
          </p>
          <p className="mt-3 text-sm text-ink/80">{open.body}</p>
          <Link href={`/product/${open.product.slug}`} className="mt-4 inline-block text-sm">
            Open product
          </Link>
          {open.status === 'PENDING' ? (
            <div className="mt-4 flex gap-2">
              <IconButton label="Approve review" icon="check" tone="success" disabled={busyId === open.id} onClick={() => void setStatus(open.id, 'APPROVED')} />
              <IconButton label="Reject review" icon="x" tone="danger" disabled={busyId === open.id} onClick={() => void setStatus(open.id, 'REJECTED')} />
            </div>
          ) : null}
        </Modal>
      ) : null}
    </div>
  );
}
