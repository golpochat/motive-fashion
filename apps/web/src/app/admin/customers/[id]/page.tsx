'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { formatEur } from '@motive-fashion/utils';
import { CHANNEL_LABEL, ORDER_STATUS_LABEL, type SalesChannel } from '@motive-fashion/config';
import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import { DataTable, JobCard, Td } from '@/components/dashboard-ui';

type CustomerHub = {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  createdAt: string;
  marketingOptIn: boolean;
  whatsappOptIn: boolean;
  addresses: {
    id: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    county?: string | null;
    eircode?: string | null;
  }[];
  orders: {
    id: string;
    ticket: string | null;
    status: string;
    channel: SalesChannel;
    fulfillment: string;
    totalCents: number;
    createdAt: string;
  }[];
  _count?: { orders: number };
};

export default function AdminCustomerHub() {
  const { id } = useParams<{ id: string }>();
  const { data, error, loading, reload } = useConsoleQuery<CustomerHub>(
    `/admin/customers/${id}`,
    'Could not load this customer',
  );

  return (
    <div>
      <PageHeader
        title={data?.name ?? 'Customer'}
        description={data ? `${data.email}${data.phone ? ` · ${data.phone}` : ''}` : 'Orders, opt-ins, and addresses on this account.'}
        actions={
          <Link href="/admin/customers" className="min-h-11 rounded-lg border border-ink/15 px-3 py-2.5 text-sm no-underline hover:border-ink/40">
            All customers
          </Link>
        }
      />
      <ConsoleSection loading={loading} error={error} onRetry={reload}>
        {data ? (
          <div className="space-y-8">
            <section className="grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-ink/45">Orders</p>
                <p className="mt-1 font-serif text-2xl">{data._count?.orders ?? data.orders.length}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-ink/45">Email</p>
                <p className="mt-1 text-sm">{data.marketingOptIn ? 'Opted in' : 'Off'}</p>
              </div>
              <div className="rounded-2xl border border-ink/10 bg-white p-4">
                <p className="text-xs uppercase tracking-wider text-ink/45">WhatsApp</p>
                <p className="mt-1 text-sm">{data.whatsappOptIn ? 'Opted in' : 'Off'}</p>
              </div>
            </section>
            <section>
              <h2 className="mb-3 font-serif text-2xl">Recent orders</h2>
              {data.orders.length === 0 ? (
                <p className="text-sm text-ink/70">No orders on this account yet.</p>
              ) : (
                <DataTable
                  headers={['Order', 'When', 'Channel', 'Status', 'Total']}
                  cards={data.orders.map((order) => (
                    <JobCard
                      key={order.id}
                      href={`/admin/pack/${order.id}`}
                      title={order.ticket ?? order.id.slice(0, 8)}
                      meta={`${ORDER_STATUS_LABEL[order.status] ?? order.status} · ${formatEur(order.totalCents)}`}
                    >
                      <p className="mt-2 text-xs text-ink/55">
                        {CHANNEL_LABEL[order.channel] ?? order.channel} ·{' '}
                        {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
                      </p>
                    </JobCard>
                  ))}
                >
                  {data.orders.map((order) => (
                    <tr key={order.id} className="hover:bg-ink/5">
                      <Td>
                        <Link href={`/admin/pack/${order.id}`} className="font-mono text-xs">
                          {order.ticket ?? order.id.slice(0, 8)}
                        </Link>
                      </Td>
                      <Td muted>{new Date(order.createdAt).toLocaleString('en-IE', { hour12: false })}</Td>
                      <Td muted>
                        {CHANNEL_LABEL[order.channel] ?? order.channel}
                        <span className="mt-1 block text-xs">
                          {order.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
                        </span>
                      </Td>
                      <Td>{ORDER_STATUS_LABEL[order.status] ?? order.status}</Td>
                      <Td>{formatEur(order.totalCents)}</Td>
                    </tr>
                  ))}
                </DataTable>
              )}
            </section>
            <section>
              <h2 className="mb-3 font-serif text-2xl">Addresses</h2>
              {data.addresses.length === 0 ? (
                <p className="text-sm text-ink/70">No saved addresses.</p>
              ) : (
                <ul className="grid gap-3 sm:grid-cols-2">
                  {data.addresses.map((address) => (
                    <li key={address.id} className="rounded-2xl border border-ink/10 bg-white p-4 text-sm">
                      {address.label ? <p className="text-xs uppercase tracking-wider text-ink/45">{address.label}</p> : null}
                      <p className="mt-1">{address.line1}</p>
                      {address.line2 ? <p>{address.line2}</p> : null}
                      <p>
                        {address.city}
                        {address.county ? `, ${address.county}` : ''}
                      </p>
                      {address.eircode ? <p className="font-mono text-xs">{address.eircode}</p> : null}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
