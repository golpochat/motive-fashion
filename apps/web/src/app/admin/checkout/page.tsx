'use client';

import { useEffect, useState } from 'react';
import { API } from '@/lib/api';
import { ErrorState, LoadingState, PageHeader } from '@/components/page-header';
import { DataTable, FilterTabs, Panel, Td } from '@/components/dashboard-ui';

type Method = {
  id: string;
  code: string;
  name: string;
  published: boolean;
  isDefault: boolean;
  feeCents?: number;
  freeOverCents?: number | null;
  publicChannel?: boolean;
  rateCents?: number;
};
type Snapshot = { fulfilment: Method[]; payments: Method[]; counties: Method[] };

function euroInput(cents: number) {
  return (cents / 100).toFixed(2);
}

export default function AdminCheckout() {
  const [data, setData] = useState<Snapshot | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('fulfilment');

  async function load() {
    const res = await fetch(`${API}/admin/commerce`, { credentials: 'include' });
    if (!res.ok) {
      setError('Could not load checkout settings');
      return;
    }
    setError('');
    setData((await res.json()) as Snapshot);
  }

  useEffect(() => {
    void load();
  }, []);

  async function patch(path: string, body: object) {
    setError('');
    const res = await fetch(`${API}${path}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { message?: string };
    if (!res.ok) {
      setError(payload.message ?? 'Update failed');
      return;
    }
    await load();
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Checkout" description="Fulfilment, county rates, and payments." />
        {error ? <ErrorState message={error} onRetry={() => void load()} /> : <LoadingState label="Loading fulfilment, county rates, and payments…" />}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Checkout"
        description="Ireland delivery is the website checkout. Collect in Dublin stays on the till. Cash stays on the till. County rates are VAT-inc and locked onto the order at pay."
      />
      {error ? <p className="text-sm text-red-700">{error}</p> : null}

      <div className="mb-6">
        <FilterTabs
          ariaLabel="Checkout settings"
          current={tab}
          onChange={setTab}
          items={[
            { id: 'fulfilment', label: 'Fulfilment' },
            { id: 'payments', label: 'Payments' },
            { id: 'counties', label: 'County rates' },
          ]}
        />
      </div>

      {tab === 'fulfilment' ? (
      <Panel title="Fulfilment">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase tracking-wider text-ink/55">
              <tr>
                <th className="py-2">Method</th>
                <th className="py-2">Published</th>
                <th className="py-2">Default</th>
                <th className="py-2">Fee / free over</th>
              </tr>
            </thead>
            <tbody>
              {data.fulfilment.map((row) => (
                <tr key={row.id} className="border-t border-ink/10">
                  <td className="py-3">
                    {row.name}
                    <span className="ml-2 text-xs text-ink/45">{row.code}</span>
                    {row.code === 'COLLECTION' ? (
                      <span className="mt-1 block text-xs text-ink/45">Till and WhatsApp only. Not offered on the website yet.</span>
                    ) : null}
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.published}
                      onChange={(e) => void patch(`/admin/commerce/fulfilment/${row.id}`, { published: e.target.checked })}
                    />
                  </td>
                  <td>
                    <input
                      type="checkbox"
                      checked={row.isDefault}
                      onChange={() => void patch(`/admin/commerce/fulfilment/${row.id}`, { isDefault: true })}
                    />
                  </td>
                  <td>
                    {row.code === 'COLLECTION' ? (
                      <label className="flex items-center gap-2 text-xs text-ink/60">
                        Fee €
                        <input
                          key={`${row.id}-fee-${row.feeCents}`}
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-24 min-h-11 rounded-lg border border-ink/15 px-2 py-2.5"
                          defaultValue={euroInput(row.feeCents ?? 0)}
                          onBlur={(e) =>
                            void patch(`/admin/commerce/fulfilment/${row.id}`, {
                              feeCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                        />
                      </label>
                    ) : (
                      <label className="flex items-center gap-2 text-xs text-ink/60">
                        Free over €
                        <input
                          key={`${row.id}-free-${row.freeOverCents}`}
                          type="number"
                          min={0}
                          step="0.01"
                          className="w-24 min-h-11 rounded-lg border border-ink/15 px-2 py-2.5"
                          defaultValue={euroInput(row.freeOverCents ?? 0)}
                          onBlur={(e) =>
                            void patch(`/admin/commerce/fulfilment/${row.id}`, {
                              freeOverCents: Math.round(Number(e.target.value) * 100),
                            })
                          }
                        />
                      </label>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
      ) : null}

      {tab === 'payments' ? (
      <Panel title="Payments">
        <DataTable headers={['Method', 'Published', 'Public', 'Default']}>
          {data.payments.map((row) => (
            <tr key={row.id} className="hover:bg-ink/[0.02]">
              <Td>
                {row.name}
                <span className="ml-2 text-xs text-ink/45">{row.code}</span>
              </Td>
              <Td>
                <input
                  type="checkbox"
                  checked={row.published}
                  onChange={(e) => void patch(`/admin/commerce/payments/${row.id}`, { published: e.target.checked })}
                />
              </Td>
              <Td muted>{row.publicChannel ? 'Web / app' : 'Till only'}</Td>
              <Td>
                <input
                  type="checkbox"
                  checked={row.isDefault}
                  onChange={() => void patch(`/admin/commerce/payments/${row.id}`, { isDefault: true })}
                />
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      ) : null}

      {tab === 'counties' ? (
      <Panel title="County delivery rates">
        <DataTable headers={['County', 'Published', 'Rate']}>
          {data.counties.map((row) => (
            <tr key={row.id} className="hover:bg-ink/[0.02]">
              <Td>{row.name}</Td>
              <Td>
                <input
                  type="checkbox"
                  checked={row.published}
                  onChange={(e) => void patch(`/admin/commerce/counties/${row.id}`, { published: e.target.checked })}
                />
              </Td>
              <Td>
                <label className="flex items-center gap-1">
                  €
                  <input
                    key={`${row.id}-rate-${row.rateCents}`}
                    type="number"
                    min={0}
                    step="0.01"
                    className="w-24 min-h-11 rounded-lg border border-ink/15 px-2 py-2.5"
                    defaultValue={euroInput(row.rateCents ?? 0)}
                    onBlur={(e) =>
                      void patch(`/admin/commerce/counties/${row.id}`, {
                        rateCents: Math.round(Number(e.target.value) * 100),
                      })
                    }
                  />
                </label>
              </Td>
            </tr>
          ))}
        </DataTable>
      </Panel>
      ) : null}
    </div>
  );
}
