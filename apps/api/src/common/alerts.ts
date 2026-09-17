import { emitLog } from './log';

/** Slack incoming-webhook compatible payload. Empty ALERT_WEBHOOK_URL skips the POST. */
export async function fireAlert(title: string, detail?: string) {
  emitLog('error', title, { alert: true, ...(detail ? { detail } : {}) });
  const url = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!url) return 'skipped' as const;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text: detail ? `${title}\n${detail}` : title }),
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) {
      emitLog('error', 'alert webhook failed', { status: res.status });
      return 'failed' as const;
    }
    return 'sent' as const;
  } catch (err) {
    emitLog('error', 'alert webhook failed', { detail: err instanceof Error ? err.message : String(err) });
    return 'failed' as const;
  }
}
