'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { API } from '@/lib/api';
import { ErrorState, LoadingState, PageHeader } from '@/components/page-header';
import { DataTable, Panel, Td } from '@/components/dashboard-ui';
import { StaffOrderActions } from '@/components/staff-order-actions';
import { ORDER_STATUS_LABEL, isVatRegistered } from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';

type StaffSaleDetail = {
  id: string;
  ticket: string;
  createdAt: string;
  name: string;
  email: string | null;
  phone: string | null;
  status: string;
  fulfillment: string;
  paymentMethod: string;
  shippingCounty: string | null;
  subtotalCents: number;
  discountCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  refundedCents?: number;
  cashierName?: string | null;
  items: {
    title: string;
    sku: string;
    size: string;
    color: string;
    quantity: number;
    unitPriceCents: number;
  }[];
};

export default function StaffOrderDetail() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<StaffSaleDetail | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!params.id) return;
    fetch(`${API}/staff/orders/${params.id}`, { credentials: 'include' })
      .then(async (res) => {
        if (!res.ok) throw new Error('not found');
        setOrder((await res.json()) as StaffSaleDetail);
      })
      .catch(() => setError('This sale could not be loaded.'));
  }, [params.id]);

  if (error) {
    return (
      <div>
        <ErrorState message={error} />
        <Link href="/staff/orders" className="mt-4 inline-block min-h-11 text-sm">
          Back to orders
        </Link>
      </div>
    );
  }

  if (!order) return <LoadingState label="Loading this sale…" />;

  return (
    <div>
      <PageHeader
        title={`Ticket ${order.ticket}`}
        description={`${order.name}${order.cashierName ? ` · ${order.cashierName}` : ''} · ${new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}`}
        actions={
          <Link href="/staff/orders" className="text-sm">
            Back to orders
          </Link>
        }
      />
      <div className="mb-6">
        <StaffOrderActions
          orderId={order.id}
          email={order.email}
          paymentMethod={order.paymentMethod}
          remainingCents={order.totalCents - (order.refundedCents ?? 0)}
          onDone={() => {
            fetch(`${API}/staff/orders/${order.id}`, { credentials: 'include' })
              .then(async (res) => {
                if (!res.ok) return;
                setOrder((await res.json()) as StaffSaleDetail);
              })
              .catch(() => undefined);
          }}
        />
      </div>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Panel title="Customer">
          <p>{order.name}</p>
          <p className="mt-1 text-sm text-ink/55">{order.email ?? 'Walk-in'}</p>
          {order.phone ? <p className="mt-1 text-sm text-ink/55">{order.phone}</p> : null}
        </Panel>
        <Panel title="Sale">
          <p>{order.paymentMethod === 'CASH' ? 'Cash' : 'Card'}</p>
          <p className="mt-1 text-sm text-ink/55">
            {order.fulfillment === 'COLLECTION' ? 'Collect in Dublin' : 'Ireland delivery'}
          </p>
          <p className="mt-1 text-sm text-ink/55">{ORDER_STATUS_LABEL[order.status] ?? order.status}</p>
        </Panel>
        <Panel title="Total">
          <p className="font-serif text-2xl">{formatEur(order.totalCents)}</p>
          {isVatRegistered() ? <p className="mt-1 text-sm text-ink/55">inc. VAT</p> : null}
        </Panel>
      </div>
      <DataTable headers={['Item', 'SKU', 'Qty', 'Each', 'Line']}>
        {order.items.map((item, index) => (
          <tr key={`${item.sku}-${index}`}>
            <Td>
              <span className="block">{item.title}</span>
              <span className="block text-xs text-ink/45">
                {item.size} / {item.color}
              </span>
            </Td>
            <Td muted>
              <span className="font-mono text-xs">{item.sku}</span>
            </Td>
            <Td>{item.quantity}</Td>
            <Td muted>{formatEur(item.unitPriceCents)}</Td>
            <Td>{formatEur(item.unitPriceCents * item.quantity)}</Td>
          </tr>
        ))}
      </DataTable>
    </div>
  );
}
