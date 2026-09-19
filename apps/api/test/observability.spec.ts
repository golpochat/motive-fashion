import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLog } from '../src/common/log';
import { fireAlert } from '../src/common/alerts';
import { httpLogLevel, httpSnapshot, recordHttp, resetHttpMetrics, shouldAlertHttp5xx } from '../src/common/http-metrics';

describe('structured logs', () => {
  it('emits JSON fields a log drain can parse', () => {
    const row = formatLog('info', 'http.request', { method: 'GET', path: '/api/v1/health', status: 200, ms: 3 });
    expect(row.level).toBe('info');
    expect(row.msg).toBe('http.request');
    expect(row.service).toBeTruthy();
    expect(row.path).toBe('/api/v1/health');
    expect(typeof row.ts).toBe('string');
  });
});

describe('HTTP metrics', () => {
  afterEach(() => {
    resetHttpMetrics();
  });

  it('logs 5xx as error and 4xx as warn', () => {
    expect(httpLogLevel(200)).toBe('info');
    expect(httpLogLevel(404)).toBe('warn');
    expect(httpLogLevel(503)).toBe('error');
  });

  it('tracks request counts and p95', () => {
    for (let i = 1; i <= 20; i += 1) recordHttp('GET', '/shop', 200, i);
    recordHttp('GET', '/boom', 500, 80);
    const snap = httpSnapshot();
    expect(snap.httpRequests).toBe(21);
    expect(snap.http5xx).toBe(1);
    expect(snap.p95Ms).toBeGreaterThanOrEqual(19);
    expect(snap.lastError?.path).toBe('/boom');
  });

  it('throttles 5xx alerts and skips health probes', () => {
    expect(shouldAlertHttp5xx('/api/v1/orders', 1_000)).toBe(true);
    expect(shouldAlertHttp5xx('/api/v1/orders', 30_000)).toBe(false);
    expect(shouldAlertHttp5xx('/api/v1/health/ready', 90_000)).toBe(false);
    expect(shouldAlertHttp5xx('/api/v1/orders', 90_000)).toBe(true);
  });
});

describe('alert webhook', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    delete process.env.ALERT_WEBHOOK_URL;
  });

  it('skips the POST when ALERT_WEBHOOK_URL is empty', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    await expect(fireAlert('worker down')).resolves.toBe('skipped');
  });

  it('posts Slack-compatible JSON when a webhook is set', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://hooks.example.test/alert';
    const fetchMock = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', fetchMock);
    await expect(fireAlert('job failed', 'expire-carts')).resolves.toBe('sent');
    expect(fetchMock).toHaveBeenCalledOnce();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(String(init.body))).toEqual({ text: 'job failed\nexpire-carts' });
  });
});
