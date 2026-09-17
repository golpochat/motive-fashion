'use client';

import Link from 'next/link';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';
import { StaffOrderActions } from '@/components/staff-order-actions';
import { ORDER_STATUS_LABEL } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { seesAllStaffSales } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

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
  refundedCents?: number;
  cashierName?: string | null;
  storeWide?: boolean;
  items: { title: string; quantity: number }[];
};

export default function StaffOrders() {
  const { me } = useSession();
  const storeWide = seesAllStaffSales(me);
  const { data, error, loading, reload } = useConsoleQuery<StaffSale[]>(
    '/staff/orders',
    'Could not load till orders',
  );
  const rows = data ?? [];

  return (
    <div>
      <PageHeader
        title="Orders"
        description={
          storeWide
            ? 'Every till sale, from every cashier. Open a ticket to reprint or email the receipt.'
            : 'Till sales you placed. Open a ticket to see the lines, reprint, or email the receipt.'
        }
      />
      <ConsoleSection
        loading={loading}
        error={error}
        onRetry={reload}
        empty={rows.length === 0}
        emptyTitle="No till sales yet"
        emptyBody={storeWide ? 'POS sales from any staff member will appear here.' : 'Sales you take on POS will appear here.'}
      >
        <DataTable headers={storeWide ? ['Ticket', 'When', 'Staff', 'Customer', 'Pay', 'Total', 'Status', ''] : ['Ticket', 'When', 'Customer', 'Pay', 'Total', 'Status', '']}>
          {rows.map((order) => (
            <tr key={order.id} className="hover:bg-ink/5">
              <Td>
                <Link href={`/staff/orders/${order.id}`} className="font-mono text-xs">
                  {order.ticket}
                </Link>
              </Td>
              <Td muted>{new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
              {storeWide ? <Td muted>{order.cashierName ?? 'Till'}</Td> : null}
              <Td>
                <span className="block">{order.name}</span>
                <span className="block text-xs text-ink/45">{order.email ?? 'Walk-in'}</span>
              </Td>
              <Td muted>{order.paymentMethod === 'CASH' ? 'Cash' : 'Card'}</Td>
              <Td>{formatEur(order.totalCents)}</Td>
              <Td muted>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
              <Td>
                <StaffOrderActions
                  orderId={order.id}
                  email={order.email}
                  paymentMethod={order.paymentMethod}
                  remainingCents={order.totalCents - (order.refundedCents ?? 0)}
                  onDone={reload}
                />
              </Td>
            </tr>
          ))}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
