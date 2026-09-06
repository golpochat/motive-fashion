'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { PageHeader } from '@/components/page-header';
import { DataTable, Field, PrimaryButton, SecondaryButton, Select, Td, fieldClass } from '@/components/dashboard-ui';
import {
  ORDER_ACTION_LABEL,
  ORDER_STATUS_LABEL,
  SHIP_CARRIERS,
  nextOrderStatus,
} from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';

type AdminOrder = {
  id: string;
  status: string;
  channel: string;
  email: string;
  fulfillment: string;
  totalCents: number;
  shipments?: { carrier?: string | null; trackingNo?: string | null }[];
};

export default function AdminOrders() {
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [shipId, setShipId] = useState('');
  const [carrier, setCarrier] = useState('AN_POST');
  const [trackingNo, setTrackingNo] = useState('');

  async function load() {
    const res = await fetch(`${API}/admin/orders`, { credentials: 'include' });
    if (!res.ok) {
      setError('Could not load orders');
      return;
    }
    setRows((await res.json()) as AdminOrder[]);
  }

  useEffect(() => {
    void load();
  }, []);

  async function advance(order: AdminOrder, status: string) {
    setError('');
    setBusyId(order.id);
    const body: { status: string; carrier?: string; trackingNo?: string } = { status };
    if (status === 'SHIPPED') {
      body.carrier = carrier;
      body.trackingNo = trackingNo.trim();
    }
    const res = await fetch(`${API}/admin/orders/${order.id}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { message?: string };
    setBusyId('');
    if (!res.ok) {
      setError(payload.message ?? 'Could not update this order');
      return;
    }
    setShipId('');
    setTrackingNo('');
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Pack, ship, or mark collection. Each step is the same record the customer tracker reads."
      />
      {error ? <p className="mb-4 text-sm text-red-700">{error}</p> : null}
      <DataTable headers={['Order', 'Fulfilment', 'Status', 'Email', 'Total', 'Next']}>
        {rows.map((order) => {
          const next = nextOrderStatus(order.fulfillment, order.status);
          const shipping = shipId === order.id;
          return (
            <tr key={order.id} className="hover:bg-ink/[0.02]">
              <Td>
                <span className="font-mono text-xs">{order.id.slice(0, 8)}</span>
              </Td>
              <Td muted>{order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}</Td>
              <Td>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
              <Td muted>{order.email}</Td>
              <Td>{formatEur(order.totalCents)}</Td>
              <Td>
                {!next ? (
                  <span className="text-ink/45">—</span>
                ) : next === 'SHIPPED' && !shipping ? (
                  <SecondaryButton type="button" onClick={() => setShipId(order.id)}>
                    Mark shipped
                  </SecondaryButton>
                ) : next === 'SHIPPED' && shipping ? (
                  <div className="flex min-w-[16rem] flex-col gap-2 py-2">
                    <Select
                      value={carrier}
                      onChange={setCarrier}
                      options={SHIP_CARRIERS.map((row) => ({ value: row.code, label: row.name }))}
                      placeholder="Carrier"
                    />
                    <Field label="Tracking number">
                      <input
                        className={fieldClass}
                        value={trackingNo}
                        onChange={(e) => setTrackingNo(e.target.value)}
                        autoComplete="off"
                      />
                    </Field>
                    <div className="flex gap-2">
                      <PrimaryButton
                        type="button"
                        disabled={busyId === order.id || trackingNo.trim().length < 4}
                        onClick={() => void advance(order, 'SHIPPED')}
                      >
                        Save
                      </PrimaryButton>
                      <SecondaryButton type="button" onClick={() => setShipId('')}>
                        Cancel
                      </SecondaryButton>
                    </div>
                  </div>
                ) : (
                  <SecondaryButton
                    type="button"
                    disabled={busyId === order.id}
                    onClick={() => void advance(order, next)}
                  >
                    {ORDER_ACTION_LABEL[next] ?? next}
                  </SecondaryButton>
                )}
              </Td>
            </tr>
          );
        })}
      </DataTable>
    </div>
  );
}
