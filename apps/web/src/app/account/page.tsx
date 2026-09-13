import { redirect } from 'next/navigation';

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AccountRedirect({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const q = await searchParams;
  const next = first(q.next);
  const reset = first(q.reset);
  const verify = first(q.verify);
  const mode = first(q.mode);
  const params = new URLSearchParams();
  if (next) params.set('next', next);
  if (verify) {
    params.set('token', verify);
    redirect(`/auth/verify?${params.toString()}`);
  }
  if (reset) {
    params.set('reset', reset);
    redirect(`/auth/reset?${params.toString()}`);
  }
  const qs = params.toString();
  const suffix = qs ? `?${qs}` : '';
  if (mode === 'register') redirect(`/auth/register${suffix}`);
  if (mode === 'forgot') redirect(`/auth/forgot${suffix}`);
  redirect(`/auth/login${suffix}`);
}
