'use client';

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { API, apiErrorMessage } from '@/lib/api';
import { ConsoleSection, PageHeader } from '@/components/page-header';
import {
  DataTable,
  Field,
  PrimaryButton,
  Select,
  Td,
  fieldClass,
} from '@/components/dashboard-ui';
import { ORDER_STATUS_LABEL, SHIP_CARRIERS, carrierBookUrl, nextOrderStatus } from '@motive-fashion/config';
import { applyPackScan, packScanComplete, type PackScanLine } from '@motive-fashion/utils';
import { Code128Mark } from '@/components/barcode-marks';

export type PackLine = {
  sku: string;
  barcode: string | null;
  title: string;
  size: string;
  color: string;
  quantity: number;
  binCode: string | null;
};

export type PackSheet = {
  id: string;
  status: string;
  fulfillment: string;
  name: string;
  email: string;
  ticket: string;
  lines: PackLine[];
};

export function PackStation({
  orderId,
  backHref,
  backLabel,
}: {
  orderId: string;
  backHref: string;
  backLabel: string;
}) {
  const scanRef = useRef<HTMLInputElement>(null);
  const [sheet, setSheet] = useState<PackSheet | null>(null);
  const [lines, setLines] = useState<PackScanLine[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState('');
  const [carrier, setCarrier] = useState('AN_POST');
  const [trackingNo, setTrackingNo] = useState('');

  const reload = useCallback(() => {
    setLoading(true);
    fetch(`${API}/admin/orders/${orderId}/pack`, { credentials: 'include' })
      .then(async (res) => {
        const payload = (await res.json()) as PackSheet & { message?: string };
        if (!res.ok) {
          setError(payload.message ?? 'Could not load this pack list');
          return;
        }
        setError('');
        setSheet(payload);
        setLines(
          payload.lines.map((line) => ({
            sku: line.sku,
            barcode: line.barcode,
            needed: line.quantity,
            scanned: 0,
          })),
        );
      })
      .catch(() => setError('Could not load this pack list'))
      .finally(() => setLoading(false));
  }, [orderId]);

  useEffect(() => {
    reload();
  }, [reload]);

  const complete = packScanComplete(lines);
  const next = sheet ? nextOrderStatus(sheet.fulfillment, sheet.status) : null;
  const detail = useMemo(() => {
    const bySku = new Map((sheet?.lines ?? []).map((line) => [line.sku, line]));
    return lines.map((line) => ({ ...line, ...(bySku.get(line.sku) ?? {}) }));
  }, [lines, sheet]);

  function onScan(e: FormEvent) {
    e.preventDefault();
    const result = applyPackScan(lines, query);
    setLines(result.lines);
    setError(result.ok ? '' : result.message);
    setNotice(result.ok ? result.message : '');
    setQuery('');
    queueMicrotask(() => scanRef.current?.focus());
  }

  async function advance(status: string) {
    if (!sheet) return;
    setError('');
    setBusy(true);
    const body: { status: string; carrier?: string; trackingNo?: string } = { status };
    if (status === 'SHIPPED') {
      body.carrier = carrier;
      body.trackingNo = trackingNo.trim();
    }
    const res = await fetch(`${API}/admin/orders/${sheet.id}/status`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const payload = (await res.json()) as { message?: string };
    setBusy(false);
    if (!res.ok) {
      setError(payload.message ?? 'Could not update this order');
      return;
    }
    setNotice(
      status === 'PACKING'
        ? 'Packed. Scan is confirmed — next is ship or ready to collect.'
        : 'Order updated.',
    );
    reload();
  }

  return (
    <div>
      <PageHeader
        title={sheet ? `Pack ${sheet.ticket}` : 'Pack station'}
        description="Walk bins with the list, then scan each hang tag here before the parcel leaves. Wrong SKU never goes in the bag."
        actions={
          <Link href={backHref} className="text-sm">
            {backLabel}
          </Link>
        }
      />
      {error ? (
        <p className="mb-4 text-sm text-red-700" role="alert">
          {error}
        </p>
      ) : null}
      {notice ? <p className="mb-4 text-sm text-moss">{notice}</p> : null}

      <ConsoleSection loading={loading} error="" onRetry={reload}>
        {sheet ? (
          <div className="space-y-6">
            <p className="text-sm text-ink/70">
              {sheet.name} · {sheet.email} · {ORDER_STATUS_LABEL[sheet.status] ?? sheet.status} ·{' '}
              {sheet.fulfillment === 'COLLECTION' ? 'Collection' : 'Delivery'}
            </p>

            <form onSubmit={onScan}>
              <input
                ref={scanRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={fieldClass}
                placeholder="Scan SKU or barcode"
                autoFocus
                aria-label="Scan SKU or barcode"
              />
            </form>

            <DataTable headers={['Bin', 'SKU', 'Piece', 'Need', 'Scanned']}>
              {detail.map((line) => {
                const done = line.scanned >= line.needed;
                return (
                  <tr key={line.sku} className={done ? 'bg-accent/10' : ''}>
                    <Td>
                      <span className="font-mono text-xs">{line.binCode || '—'}</span>
                    </Td>
                    <Td>
                      <span className="block font-medium">{line.title ?? line.sku}</span>
                      <span className="block font-mono text-[11px] text-ink/55">{line.sku}</span>
                      <span className="text-xs text-ink/55">
                        {line.size} · {line.color}
                      </span>
                    </Td>
                    <Td muted>Hang tag</Td>
                    <Td>{line.needed}</Td>
                    <Td>
                      <span className={done ? 'text-moss' : ''}>
                        {line.scanned}/{line.needed}
                      </span>
                    </Td>
                  </tr>
                );
              })}
            </DataTable>

            <div className="max-w-sm space-y-2 rounded-2xl border border-ink/10 bg-white p-4 print:hidden">
              <p className="text-xs uppercase tracking-wider text-ink/55">Tote / bag</p>
              <Code128Mark value={sheet.ticket} label={`Order ${sheet.ticket}`} />
              <p className="font-mono text-sm">{sheet.ticket}</p>
            </div>

            <div className="space-y-3 print:hidden">
              {!complete ? (
                <p className="text-sm text-ink/55">Scan every piece before the next status.</p>
              ) : null}
              <div className="flex flex-wrap gap-2">
              {next === 'PACKING' ? (
                <PrimaryButton type="button" disabled={!complete || busy} onClick={() => void advance('PACKING')}>
                  Mark packed
                </PrimaryButton>
              ) : null}
              {next === 'SHIPPED' ? (
                <div className="flex min-w-[16rem] flex-col gap-2">
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
                  <PrimaryButton
                    type="button"
                    disabled={!complete || busy || trackingNo.trim().length < 4}
                    onClick={() => void advance('SHIPPED')}
                  >
                    Mark shipped
                  </PrimaryButton>
                </div>
              ) : null}
              {next === 'READY_FOR_COLLECTION' ? (
                <PrimaryButton
                  type="button"
                  disabled={!complete || busy}
                  onClick={() => void advance('READY_FOR_COLLECTION')}
                >
                  Ready to collect
                </PrimaryButton>
              ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
