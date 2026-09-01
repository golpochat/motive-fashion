import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Me = { permissions?: string[] };

function has(keys: string[] | undefined, needed: string) {
  return Boolean(keys?.includes('*') || keys?.includes(needed));
}

function requiredPerm(pathname: string) {
  if (pathname.startsWith('/super-admin')) return 'rbac.roles.write';
  if (pathname.startsWith('/admin')) return 'dashboard.admin';
  if (pathname.startsWith('/staff')) return 'dashboard.staff';
  if (pathname.startsWith('/user')) return 'authenticated';
  return null;
}

export async function middleware(request: NextRequest) {
  const needed = requiredPerm(request.nextUrl.pathname);
  if (!needed) return NextResponse.next();
  const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';
  const cookie = request.headers.get('cookie') ?? '';
  try {
    const res = await fetch(`${apiOrigin}/api/v1/account/me`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const me = (await res.json()) as Me;
      if (needed === 'authenticated') return NextResponse.next();
      if (has(me.permissions, needed)) {
        return NextResponse.next();
      }
    }
  } catch {
    /* fail closed */
  }
  const login = new URL('/account', request.url);
  login.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/super-admin',
    '/super-admin/:path*',
    '/admin',
    '/admin/:path*',
    '/staff',
    '/staff/:path*',
    '/user',
    '/user/:path*',
  ],
};
