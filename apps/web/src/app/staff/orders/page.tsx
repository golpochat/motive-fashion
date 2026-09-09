'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { API } from '@/lib/api';
import { EmptyState, PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';
import { StaffOrderActions } from '@/components/staff-order-actions';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';

export type StaffSale = {
  id: string;
  ticket: string;
  createdAt: string;
  name: string;
  email: string | null;
  status: string;
  fulfillment: string;
  paymentMethod: string;
  totalCents: number;
  items: { title: string; quantity: number }[];
};

export default function StaffOrders() {
  const [rows, setRows] = useState<StaffSale[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    fetch(`${API}/staff/orders`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('Could not load your till orders');
        setRows((await res.json()) as StaffSale[]);
      })
      .catch(() => {
        setError('Could not load your till orders');
        setRows([]);
      });
  }, []);

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Till sales you placed. Open a ticket to see the lines, reprint, or email the receipt."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      {rows && rows.length === 0 ? (
        <EmptyState title="No till sales yet" body="Sales you take on POS will appear here." />
      ) : (
        <DataTable headers={['Ticket', 'When', 'Customer', 'Pay', 'Total', 'Status', '']}>
          {(rows ?? []).map((order) => (
            <tr key={order.id} className="hover:bg-ink/[0.02]">
              <Td>
                <Link href={`/staff/orders/${order.id}`} className="font-mono text-xs">
                  {order.ticket}
                </Link>
              </Td>
              <Td muted>{new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
              <Td>
                <span className="block">{order.name}</span>
                <span className="block text-xs text-ink/45">{order.email ?? 'Walk-in'}</span>
              </Td>
              <Td muted>{order.paymentMethod === 'CASH' ? 'Cash' : 'Card'}</Td>
              <Td>{formatEur(order.totalCents)}</Td>
              <Td muted>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
              <Td>
                <StaffOrderActions orderId={order.id} email={order.email} />
              </Td>
            </tr>
          ))}
        </DataTable>
      )}
    </div>
  );
}
