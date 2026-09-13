'use client';

import { useEffect, useMemo, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  PrimaryButton,
  SecondaryButton,
  Select,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';
import {
  CHANNEL_LABEL,
  ORDER_ACTION_LABEL,
  ORDER_STATUS_LABEL,
  SHIP_CARRIERS,
  nextOrderStatus,
  type SalesChannel,
} from '@motive-fashion/config';
import { formatEur } from '@motive-fashion/utils';
import { hasPerm } from '@/lib/rbac';
import { useSession } from '@/components/session-provider';

type AdminOrder = {
  id: string;
  status: string;
  channel: SalesChannel;
  email: string;
  name: string;
  fulfillment: string;
  paymentMethod: string;
  totalCents: number;
  createdAt: string;
  ticket: string | null;
  cashierName: string | null;
  refundedCents: number;
  shipments?: { carrier?: string | null; trackingNo?: string | null }[];
};

export default function AdminOrders() {
  const { me } = useSession();
  const canRefund = hasPerm(me, 'orders.refund');
  const [rows, setRows] = useState<AdminOrder[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState('');
  const [shipId, setShipId] = useState('');
  const [refundId, setRefundId] = useState('');
  const [channel, setChannel] = useState('ALL');
  const [carrier, setCarrier] = useState('AN_POST');
  const [trackingNo, setTrackingNo] = useState('');
  const [refundEur, setRefundEur] = useState('');
  const [refundReason, setRefundReason] = useState('');

  async function load() {
    setLoading(true);
    const res = await fetch(`${API}/admin/orders`, { credentials: 'include' });
    if (!res.ok) {
      setError('Could not load orders');
      setLoading(false);
      return;
    }
    setError('');
    setRows((await res.json()) as AdminOrder[]);
    setLoading(false);
  }

  useEffect(() => {
    void load();
  }, []);

  const visible = useMemo(
    () => (channel === 'ALL' ? rows : rows.filter((row) => row.channel === channel)),
    [channel, rows],
  );

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

  async function refund(order: AdminOrder) {
    setError('');
    const amountCents = Math.round(Number(refundEur) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setError('Enter a refund amount');
      return;
    }
    setBusyId(order.id);
    const res = await fetch(`${API}/admin/orders/${order.id}/refund`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amountCents, reason: refundReason.trim() }),
    });
    const payload = await res.json().catch(() => null);
    setBusyId('');
    if (!res.ok) {
      setError(apiErrorMessage(payload, 'Could not refund this order'));
      return;
    }
    setRefundId('');
    setRefundEur('');
    setRefundReason('');
    await load();
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every paid web, till, WhatsApp, and app order — including sales taken by any staff member. Use Staff till to see cashiers only."
      />
      {error && rows.length ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4">
        <FilterTabs
          ariaLabel="Sales channel"
          current={channel}
          onChange={setChannel}
          items={[
            { id: 'ALL', label: 'All' },
            { id: 'WEB', label: 'Web' },
            { id: 'POS', label: 'Staff till' },
            { id: 'WHATSAPP', label: 'WhatsApp' },
            { id: 'MOBILE', label: 'App' },
          ]}
        />
      </div>
      <ConsoleSection
        loading={loading}
        error={rows.length ? '' : error}
        onRetry={() => void load()}
        empty={visible.length === 0}
        emptyTitle={channel === 'ALL' ? 'No orders' : 'No orders in this channel'}
        emptyBody={
          channel === 'POS'
            ? 'Every POS sale from any cashier appears here once it is taken.'
            : 'Web checkout and staff till sales both appear here once they are placed.'
        }
      >
        <DataTable
          headers={
            channel === 'POS'
              ? ['Ticket', 'Staff', 'Customer', 'Pay', 'Status', 'Total', 'Next']
              : ['Order', 'Channel', 'Staff', 'Customer', 'Status', 'Total', 'Next']
          }
        >
          {visible.map((order) => {
            const next = nextOrderStatus(order.fulfillment, order.status);
            const shipping = shipId === order.id;
            const refunding = refundId === order.id;
            const remaining = order.totalCents - (order.refundedCents ?? 0);
            return (
              <tr key={order.id} className="hover:bg-ink/[0.02]">
                <Td>
                  <span className="font-mono text-xs">{order.ticket ?? order.id.slice(0, 8)}</span>
                  <span className="mt-1 block text-xs text-ink/45">
                    {new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}
                  </span>
                </Td>
                {channel === 'POS' ? (
                  <Td>{order.cashierName ?? 'Till'}</Td>
                ) : (
                  <>
                    <Td muted>
                      {CHANNEL_LABEL[order.channel] ?? order.channel}
                      <span className="mt-1 block text-xs">
                        {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
                        {order.paymentMethod === 'CASH' ? ' · Cash' : ' · Card'}
                      </span>
                    </Td>
                    <Td muted>{order.channel === 'POS' ? order.cashierName ?? 'Till' : '—'}</Td>
                  </>
                )}
                <Td>
                  <span className="block">{order.name}</span>
                  <span className="block text-xs text-ink/45">{order.email}</span>
                </Td>
                {channel === 'POS' ? (
                  <Td muted>{order.paymentMethod === 'CASH' ? 'Cash' : 'Card'}</Td>
                ) : null}
                <Td>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
                <Td>
                  {formatEur(order.totalCents)}
                  {order.refundedCents ? (
                    <span className="mt-1 block text-xs text-ink/45">Refunded {formatEur(order.refundedCents)}</span>
                  ) : null}
                </Td>
                <Td>
                  {shipping ? (
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
                  ) : refunding ? (
                    <div className="flex min-w-[16rem] flex-col gap-2 py-2">
                      <Field label="Amount EUR">
                        <input
                          className={fieldClass}
                          value={refundEur}
                          onChange={(e) => setRefundEur(e.target.value)}
                          inputMode="decimal"
                        />
                      </Field>
                      <Field label="Reason">
                        <input
                          className={fieldClass}
                          value={refundReason}
                          onChange={(e) => setRefundReason(e.target.value)}
                        />
                      </Field>
                      <div className="flex gap-2">
                        <PrimaryButton
                          type="button"
                          disabled={busyId === order.id || refundReason.trim().length < 3}
                          onClick={() => void refund(order)}
                        >
                          Refund
                        </PrimaryButton>
                        <SecondaryButton type="button" onClick={() => setRefundId('')}>
                          Cancel
                        </SecondaryButton>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-start gap-2">
                      {next ? (
                        next === 'SHIPPED' ? (
                          <SecondaryButton type="button" onClick={() => setShipId(order.id)}>
                            Mark shipped
                          </SecondaryButton>
                        ) : (
                          <SecondaryButton
                            type="button"
                            disabled={busyId === order.id}
                            onClick={() => void advance(order, next)}
                          >
                            {ORDER_ACTION_LABEL[next] ?? next}
                          </SecondaryButton>
                        )
                      ) : (
                        <span className="text-ink/45">—</span>
                      )}
                      {canRefund && remaining > 0 && order.status !== 'CANCELLED' && order.status !== 'PENDING_PAYMENT' ? (
                        <SecondaryButton
                          type="button"
                          onClick={() => {
                            setRefundId(order.id);
                            setRefundEur((remaining / 100).toFixed(2));
                            setRefundReason('');
                          }}
                        >
                          Refund
                        </SecondaryButton>
                      ) : null}
                    </div>
                  )}
                </Td>
              </tr>
            );
          })}
        </DataTable>
      </ConsoleSection>
    </div>
  );
}
