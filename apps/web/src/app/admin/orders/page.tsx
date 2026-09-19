'use client';

import { useMemo, useState } from 'react';
import { API, apiErrorMessage } from '@/lib/api';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  FilterTabs,
  IconButton,
  JobCard,
  PrimaryButton,
  RowActions,
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
  carrierBookUrl,
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
  const canPack = hasPerm(me, 'orders.pack');
  const { data, error: loadError, loading, reload } = useConsoleQuery<AdminOrder[]>(
    '/admin/orders',
    'Could not load orders',
  );
  const rows = data ?? [];
  const [formError, setFormError] = useState('');
  const [busyId, setBusyId] = useState('');
  const [shipId, setShipId] = useState('');
  const [refundId, setRefundId] = useState('');
  const [channel, setChannel] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [q, setQ] = useState('');
  const [carrier, setCarrier] = useState('AN_POST');
  const [trackingNo, setTrackingNo] = useState('');
  const [refundEur, setRefundEur] = useState('');
  const [refundReason, setRefundReason] = useState('');
  const error = formError || loadError;

  const visible = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return rows.filter((row) => {
      if (channel !== 'ALL' && row.channel !== channel) return false;
      if (status !== 'ALL' && row.status !== status) return false;
      if (!needle) return true;
      return (
        row.id.toLowerCase().includes(needle) ||
        (row.ticket ?? '').toLowerCase().includes(needle) ||
        row.email.toLowerCase().includes(needle) ||
        row.name.toLowerCase().includes(needle)
      );
    });
  }, [channel, status, q, rows]);

  async function advance(order: AdminOrder, status: string) {
    setFormError('');
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
      setFormError(payload.message ?? 'Could not update this order');
      return;
    }
    setShipId('');
    setTrackingNo('');
    reload();
  }

  async function refund(order: AdminOrder) {
    setFormError('');
    const amountCents = Math.round(Number(refundEur) * 100);
    if (!Number.isFinite(amountCents) || amountCents < 1) {
      setFormError('Enter a refund amount');
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
      setFormError(apiErrorMessage(payload, 'Could not refund this order'));
      return;
    }
    setRefundId('');
    setRefundEur('');
    setRefundReason('');
    reload();
  }

  return (
    <div>
      <PageHeader
        title="Orders"
        description="Every paid web, till, WhatsApp, and app order. Open a ticket to pack, or filter by channel and search."
      />
      {error && rows.length ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
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
        <FilterTabs
          ariaLabel="Order status"
          current={status}
          onChange={setStatus}
          items={[
            { id: 'ALL', label: 'All statuses' },
            { id: 'CONFIRMED', label: 'Confirmed' },
            { id: 'PACKING', label: 'Packing' },
            { id: 'SHIPPED', label: 'Shipped' },
            { id: 'READY_FOR_COLLECTION', label: 'Ready' },
            { id: 'DELIVERED', label: 'Delivered' },
            { id: 'COLLECTED', label: 'Collected' },
          ]}
        />
        <Field label="Find an order">
          <input
            className={fieldClass}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ticket, name, or email"
            autoComplete="off"
          />
        </Field>
      </div>
      <ConsoleSection
        loading={loading}
        error={rows.length ? '' : error}
        onRetry={reload}
        empty={visible.length === 0}
        emptyTitle={q.trim() ? 'No matching orders' : status !== 'ALL' ? 'No orders in this status' : channel === 'ALL' ? 'No orders' : 'No orders in this channel'}
        emptyBody={
          channel === 'POS'
            ? 'Every POS sale from any cashier appears here once it is taken.'
            : 'Web checkout and staff till sales both appear here once they are placed.'
        }
      >
        <DataTable
          headers={
            channel === 'POS'
              ? ['Ticket', 'Staff', 'Customer', 'Pay', 'Status', 'Total', 'Action']
              : ['Order', 'Channel', 'Staff', 'Customer', 'Status', 'Total', 'Action']
          }
          cards={visible.map((order) => (
            <JobCard
              key={order.id}
              href={`/admin/pack/${order.id}`}
              title={order.ticket ?? order.id.slice(0, 8)}
              meta={`${ORDER_STATUS_LABEL[order.status] ?? order.status} · ${formatEur(order.totalCents)}`}
            >
              <p className="mt-2 text-sm">{order.name}</p>
              <p className="text-xs text-ink/55">
                {CHANNEL_LABEL[order.channel] ?? order.channel} · {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
              </p>
            </JobCard>
          ))}
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
                      {carrierBookUrl(carrier) ? (
                        <a href={carrierBookUrl(carrier) ?? undefined} className="text-xs" rel="noreferrer" target="_blank">
                          Open {SHIP_CARRIERS.find((row) => row.code === carrier)?.name} booking
                        </a>
                      ) : null}
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
                      <p className="text-xs text-ink/55">
                        {order.paymentMethod === 'CASH'
                          ? 'Cash — hand this amount back. It will appear under Refunds, not in Stripe.'
                          : 'Card — Stripe will refund this amount to the original card.'}
                      </p>
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
                          {order.paymentMethod === 'CASH' ? 'Refund cash' : 'Refund card'}
                        </PrimaryButton>
                        <SecondaryButton type="button" onClick={() => setRefundId('')}>
                          Cancel
                        </SecondaryButton>
                      </div>
                    </div>
                  ) : (
                    <RowActions>
                      {canPack ? (
                        <IconButton label="Open ticket" icon="pack" href={`/admin/pack/${order.id}`} />
                      ) : null}
                      {canPack && (next === 'PACKING' || order.status === 'PACKING') ? null : next ? (
                        next === 'SHIPPED' ? (
                          <IconButton label="Mark shipped" icon="truck" onClick={() => setShipId(order.id)} />
                        ) : (
                          <IconButton
                            label={ORDER_ACTION_LABEL[next] ?? next}
                            icon={next === 'READY_FOR_COLLECTION' || next === 'DELIVERED' || next === 'COLLECTED' ? 'check' : 'pack'}
                            disabled={busyId === order.id}
                            onClick={() => void advance(order, next)}
                          />
                        )
                      ) : null}
                      {canRefund && remaining > 0 && order.status !== 'CANCELLED' && order.status !== 'PENDING_PAYMENT' ? (
                        <IconButton
                          label="Refund"
                          icon="refund"
                          onClick={() => {
                            setRefundId(order.id);
                            setRefundEur((remaining / 100).toFixed(2));
                            setRefundReason('');
                          }}
                        />
                      ) : null}
                    </RowActions>
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
