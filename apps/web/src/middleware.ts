import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { adminPathForStaffRoute } from '@/lib/rbac';
import { canAccessWorkspaceKeys, isMfaSetupPath, mfaSetupPath, principalWorkspace, workspaceHome } from '@motive-fashion/utils';

type Me = { permissions?: string[]; mfaRequired?: boolean };

function workspaceOf(pathname: string) {
  if (pathname.startsWith('/super-admin')) return 'super-admin' as const;
  if (pathname.startsWith('/admin')) return 'admin' as const;
  if (pathname.startsWith('/staff')) return 'staff' as const;
  if (pathname.startsWith('/user')) return 'customer' as const;
  return null;
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

  const isWorkspace =
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/user');
  const isShop = pathname === '/cart' || pathname.startsWith('/checkout');
  if (!isWorkspace && !isShop) return NextResponse.next();

  const apiOrigin = process.env.API_ORIGIN ?? 'http://localhost:4000';
  const cookie = request.headers.get('cookie') ?? '';
  try {
    const res = await fetch(`${apiOrigin}/api/v1/account/me`, {
      headers: { cookie },
      cache: 'no-store',
    });
    if (res.ok) {
      const me = (await res.json()) as Me;
      const home = workspaceHome(principalWorkspace(me.permissions));
      if (isShop) {
        if (principalWorkspace(me.permissions) !== 'customer') {
          const url = request.nextUrl.clone();
          url.pathname = home;
          url.search = '';
          return NextResponse.redirect(url);
        }
        return NextResponse.next();
      }
      if (me.mfaRequired && !isMfaSetupPath(pathname, me.permissions)) {
        const setup = new URL(mfaSetupPath(me.permissions), request.url);
        setup.searchParams.set('mfa', '1');
        setup.searchParams.set('next', pathname);
        return NextResponse.redirect(setup);
      }
      if (pathname.startsWith('/staff') && principalWorkspace(me.permissions) === 'admin') {
        const url = request.nextUrl.clone();
        url.pathname = adminPathForStaffRoute(pathname);
        return NextResponse.redirect(url);
      }
      const needed = workspaceOf(pathname);
      if (needed && (canAccessWorkspaceKeys(me.permissions, needed) || (me.mfaRequired && isMfaSetupPath(pathname, me.permissions)))) {
        return NextResponse.next();
      }
      if (needed) {
        const url = request.nextUrl.clone();
        url.pathname = home;
        url.search = '';
        return NextResponse.redirect(url);
      }
    }
  } catch {
    /* fail closed for workspaces; guests may still shop */
  }
  if (isShop) return NextResponse.next();
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
    '/cart',
    '/checkout',
    '/checkout/:path*',
  ],
};
