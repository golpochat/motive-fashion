const API = process.env.NEXT_PUBLIC_API_URL ?? '/api/v1';

let refreshInflight: Promise<boolean> | null = null;

function isAuthRefreshUrl(url: string) {
  return url.includes('/auth/refresh') || url.includes('/auth/login') || url.includes('/auth/logout');
}

/** Rotate the 15-minute access cookie. Refresh tokens are single-use, so callers share one in-flight POST. */
export function refreshAuthCookies() {
  if (!refreshInflight) {
    refreshInflight = fetch(`${API}/auth/refresh`, { method: 'POST', credentials: 'include' })
      .then((res) => res.ok)
      .finally(() => {
        refreshInflight = null;
      });
  }
  return refreshInflight;
}

export async function fetchAuthed(input: string, init?: RequestInit) {
  const options: RequestInit = { ...init, credentials: 'include' };
  const first = await fetch(input, options);
  if (first.status !== 401 || isAuthRefreshUrl(input)) return first;
  const ok = await refreshAuthCookies();
  if (!ok) return first;
  return fetch(input, options);
}
