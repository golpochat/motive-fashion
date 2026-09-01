export type Me = {
  id: string;
  name: string;
  email: string;
  role?: string;
  roles?: { id: string; slug: string; name: string }[];
  permissions?: string[];
};

export function hasPerm(me: Me | null | undefined, key: string) {
  const keys = me?.permissions ?? [];
  return keys.includes('*') || keys.includes(key);
}

export function homePath(me: Me) {
  if (hasPerm(me, 'rbac.roles.write') || hasPerm(me, 'dashboard.super')) return '/super-admin';
  if (hasPerm(me, 'dashboard.admin')) return '/admin';
  if (hasPerm(me, 'dashboard.staff')) return '/staff';
  return '/user';
}

export function safeNext(next: string | null) {
  if (!next || next.startsWith('//')) return null;
  if (
    next.startsWith('/super-admin') ||
    next.startsWith('/admin') ||
    next.startsWith('/staff') ||
    next.startsWith('/user')
  ) {
    return next;
  }
  return null;
}
