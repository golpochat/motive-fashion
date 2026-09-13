import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

type Me = { permissions?: string[] };

function has(keys: string[] | undefined, needed: string) {
  return Boolean(keys?.includes('*') || keys?.includes(needed));
}

function allowedFor(pathname: string, permissions: string[] | undefined) {
  if (pathname.startsWith('/super-admin')) {
    return has(permissions, 'dashboard.super') || has(permissions, 'rbac.roles.write');
  }
  if (pathname.startsWith('/admin')) return has(permissions, 'dashboard.admin');
  if (pathname.startsWith('/staff')) {
    return has(permissions, 'dashboard.staff') || has(permissions, 'pos.sale');
  }
  if (pathname.startsWith('/user')) return true;
  return false;
}

function redirectLegacyAccount(request: NextRequest) {
  const url = request.nextUrl.clone();
  const mode = url.searchParams.get('mode');
  const reset = url.searchParams.get('reset');
  const verify = url.searchParams.get('verify');
  if (verify) {
    url.pathname = '/auth/verify';
    url.searchParams.delete('verify');
    url.searchParams.set('token', verify);
  } else if (reset) {
    url.pathname = '/auth/reset';
  } else if (mode === 'register') {
    url.pathname = '/auth/register';
    url.searchParams.delete('mode');
  } else if (mode === 'forgot') {
    url.pathname = '/auth/forgot';
    url.searchParams.delete('mode');
  } else {
    url.pathname = '/auth/login';
    url.searchParams.delete('mode');
  }
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === '/account') {
    return redirectLegacyAccount(request);
  }

  const isProtected =
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/user');
  if (!isProtected) return NextResponse.next();

  const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';
  const cookie = request.headers.get('cookie') ?? '';
  try {
    const res = await fetch(`${apiOrigin}/api/v1/account/me`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const me = (await res.json()) as Me;
      if (allowedFor(pathname, me.permissions)) {
        return NextResponse.next();
      }
    }
  } catch {
    /* fail closed */
  }
  const login = new URL('/auth/login', request.url);
  login.searchParams.set('next', pathname);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    '/account',
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
