export type HttpLastError = {
  at: string;
  method: string;
  path: string;
  status: number;
};

const SAMPLE = 500;
const ALERT_COOLDOWN_MS = 60_000;

const durations: number[] = [];
let requests = 0;
let status4xx = 0;
let status5xx = 0;
let lastError: HttpLastError | null = null;
let lastAlertAt = 0;

export function httpLogLevel(status: number): 'error' | 'warn' | 'info' {
  if (status >= 500) return 'error';
  if (status >= 400) return 'warn';
  return 'info';
}

export function recordHttp(method: string, path: string, status: number, ms: number) {
  requests += 1;
  durations.push(Math.max(0, ms));
  if (durations.length > SAMPLE) durations.shift();
  if (status >= 500) {
    status5xx += 1;
    lastError = { at: new Date().toISOString(), method, path, status };
  } else if (status >= 400) {
    status4xx += 1;
  }
}

export function shouldAlertHttp5xx(path: string, now = Date.now()) {
  if (path.includes('/health')) return false;
  if (lastAlertAt > 0 && now - lastAlertAt < ALERT_COOLDOWN_MS) return false;
  lastAlertAt = now;
  return true;
}

function percentile(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx] ?? 0;
}

export function httpSnapshot() {
  const sorted = [...durations].sort((a, b) => a - b);
  return {
    httpRequests: requests,
    http4xx: status4xx,
    http5xx: status5xx,
    p50Ms: percentile(sorted, 50),
    p95Ms: percentile(sorted, 95),
    sampleSize: sorted.length,
    lastError,
  };
}

export function resetHttpMetrics() {
  durations.length = 0;
  requests = 0;
  status4xx = 0;
  status5xx = 0;
  lastError = null;
  lastAlertAt = 0;
}
