export type Me = {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  role?: string;
  emailVerified?: boolean;
  mfaEnabled?: boolean;
  roles?: { id: string; slug: string; name: string }[];
  permissions?: string[];
  addresses?: {
    id: string;
    label?: string | null;
    line1: string;
    line2?: string | null;
    city: string;
    county?: string | null;
    eircode?: string | null;
    isDefault?: boolean;
  }[];
};

export function hasPerm(me: Me | null | undefined, key: string) {
  const keys = me?.permissions ?? [];
  return keys.includes('*') || keys.includes(key);
}

export function hasAnyPerm(me: Me | null | undefined, keys: string[]) {
  return keys.some((key) => hasPerm(me, key));
}

export function seesAllStaffSales(me: Me | null | undefined) {
  return hasPerm(me, 'dashboard.admin') || me?.role === 'ADMIN';
}

export function roleLabel(me: Me | null | undefined) {
  if (!me) return 'Guest';
  if (me.roles?.length) return me.roles.map((r) => r.name).join(', ');
  if (me.role === 'ADMIN') return 'Admin';
  if (me.role === 'STAFF') return 'Staff';
  return 'Customer';
}

export function initials(me: Me | null | undefined) {
  const source = me?.name?.trim() || me?.email || '?';
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0]![0]}${parts[1]![0]}`.toUpperCase();
  return source.slice(0, 2).toUpperCase();
}

export function homePath(me: Me) {
  if (hasAnyPerm(me, ['rbac.roles.write', 'dashboard.super'])) return '/super-admin';
  if (hasPerm(me, 'dashboard.admin')) return '/admin';
  if (hasPerm(me, 'dashboard.staff') || hasPerm(me, 'pos.sale')) return '/staff';
  return '/user';
}

export function safeNext(next: string | null) {
  if (!next || !next.startsWith('/') || next.startsWith('//')) return null;
  const path = next.split('?')[0];
  if (
    path.startsWith('/super-admin') ||
    path.startsWith('/admin') ||
    path.startsWith('/staff') ||
    path.startsWith('/user') ||
    path === '/checkout' ||
    path === '/cart'
  ) {
    return next;
  }
  return null;
}

export function loginContext(next: string | null) {
  const path = safeNext(next)?.split('?')[0] ?? '';
  if (path.startsWith('/super-admin')) {
    return {
      title: 'Sign in to Super admin',
      copy: 'Use your Motive Fashion work email and password.',
      allowRegister: false,
    };
  }
  if (path.startsWith('/admin')) {
    return {
      title: 'Sign in to Admin',
      copy: 'Use your Motive Fashion work email and password.',
      allowRegister: false,
    };
  }
  if (path.startsWith('/staff')) {
    return {
      title: 'Sign in to Staff',
      copy: 'Use your shop-floor email and password to open the till, orders, and inventory.',
      allowRegister: false,
    };
  }
  if (path === '/checkout' || path === '/cart') {
    return {
      title: 'Sign in',
      copy: 'Sign in to use a saved address at checkout. You can still pay as a guest from the cart.',
      allowRegister: true,
    };
  }
  return {
    title: 'Sign in',
    copy: 'Use the email and password for this Motive Fashion account.',
    allowRegister: true,
  };
}

export function isWorkspacePath(pathname: string) {
  return (
    pathname.startsWith('/super-admin') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/staff') ||
    pathname.startsWith('/user')
  );
}

export function isAuthPath(pathname: string) {
  return pathname === '/account' || pathname === '/auth' || pathname.startsWith('/auth/');
}

export type AuthRoute = '/auth/login' | '/auth/register' | '/auth/forgot' | '/auth/reset' | '/auth/verify';

export function authHref(path: AuthRoute, next?: string | null, extra?: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const safe = safeNext(next ?? null);
  if (safe) params.set('next', safe);
  if (extra) {
    for (const [key, value] of Object.entries(extra)) {
      if (value) params.set(key, value);
    }
  }
  const query = params.toString();
  return query ? `${path}?${query}` : path;
}
