'use client';

import { useConsoleQuery } from '@/lib/console-query';
import { ConsoleSection, PageHeader, StatCard } from '@/components/page-header';
import { DataTable, Td } from '@/components/dashboard-ui';

type Metrics = {
  ok: boolean;
  uptimeSec: number;
  rssBytes: number;
  heapUsedBytes: number;
  node: string;
  httpRequests: number;
  http4xx: number;
  http5xx: number;
  p50Ms: number;
  p95Ms: number;
  sampleSize: number;
  lastError: { at: string; method: string; path: string; status: number } | null;
};

type Ready = { ok: boolean; database?: string; redis?: string };

function mb(bytes: number) {
  return `${Math.round(bytes / 1024 / 1024)} MB`;
}

function uptime(sec: number) {
  if (sec < 120) return `${sec}s`;
  if (sec < 7200) return `${Math.round(sec / 60)}m`;
  return `${(sec / 3600).toFixed(1)}h`;
}

export default function AdminHealth() {
  const metrics = useConsoleQuery<Metrics>('/health/metrics', 'Could not load API metrics');
  const ready = useConsoleQuery<Ready>('/health/ready', 'Could not reach Postgres or Redis');
  const data = metrics.data;

  return (
    <div>
      <PageHeader
        title="Health"
        description="In-process HTTP counts and p95 from this API process. Attach stdout to a host drain and set ALERT_WEBHOOK_URL for 5xx."
      />
      <ConsoleSection loading={metrics.loading} error={metrics.error} onRetry={metrics.reload}>
        {data ? (
          <>
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard label="Uptime" value={uptime(data.uptimeSec)} hint={data.node} />
              <StatCard label="RSS" value={mb(data.rssBytes)} hint={`Heap ${mb(data.heapUsedBytes)}`} />
              <StatCard
                label="Dependencies"
                value={ready.data?.ok ? 'Up' : ready.error ? 'Down' : '…'}
                hint={ready.data ? `Postgres ${ready.data.database} · Redis ${ready.data.redis}` : ready.error || 'Checking'}
              />
            </div>
            <div className="mt-8 grid gap-4 sm:grid-cols-3">
              <StatCard label="HTTP requests" value={String(data.httpRequests)} hint={`${data.sampleSize} in p95 window`} />
              <StatCard label="p95" value={`${data.p95Ms} ms`} hint={`p50 ${data.p50Ms} ms`} />
              <StatCard label="5xx" value={String(data.http5xx)} hint={`${data.http4xx} client errors`} />
            </div>
            <h2 className="mt-10 font-serif text-2xl [[data-theme=admin]_&]:font-sans">Last 5xx</h2>
            <div className="mt-3">
              {data.lastError ? (
                <DataTable headers={['When', 'Method', 'Path', 'Status']}>
                  <tr className="hover:bg-ink/5">
                    <Td muted>{new Date(data.lastError.at).toLocaleString('en-IE', { hour12: false })}</Td>
                    <Td>{data.lastError.method}</Td>
                    <Td>
                      <span className="font-mono text-xs">{data.lastError.path}</span>
                    </Td>
                    <Td>{data.lastError.status}</Td>
                  </tr>
                </DataTable>
              ) : (
                <p className="text-sm text-ink/55">No 5xx recorded in this process yet.</p>
              )}
            </div>
          </>
        ) : null}
      </ConsoleSection>
    </div>
  );
}
