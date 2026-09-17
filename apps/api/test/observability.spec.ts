import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatLog } from '../src/common/log';
import { fireAlert } from '../src/common/alerts';

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
