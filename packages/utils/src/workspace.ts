export type PrincipalWorkspace = 'super-admin' | 'admin' | 'staff' | 'customer';

/** Keys that belong to the access-control principal. `*` expands to these, never to commerce. */
export const ACCESS_CONTROL_KEYS = [
  'dashboard.super',
  'rbac.roles.write',
  'rbac.users.assign',
  'audit.read',
] as const;

export function principalWorkspace(keys: string[] | undefined | null): PrincipalWorkspace {
  const held = keys ?? [];
  if (held.includes('dashboard.super') || held.includes('rbac.roles.write') || held.includes('*')) {
    return 'super-admin';
  }
  if (held.includes('dashboard.admin')) return 'admin';
  if (held.includes('dashboard.staff') || held.includes('pos.sale')) return 'staff';
  return 'customer';
}

export function workspaceHome(id: PrincipalWorkspace) {
  if (id === 'super-admin') return '/super-admin';
  if (id === 'admin') return '/admin';
  if (id === 'staff') return '/staff';
  return '/user';
}

export function mfaSetupPath(keys: string[] | undefined | null) {
  const id = principalWorkspace(keys);
  if (id === 'customer') return '/user/profile';
  return `${workspaceHome(id)}/security`;
}

export function isMfaSetupPath(pathname: string, keys?: string[] | undefined | null) {
  const setup = mfaSetupPath(keys);
  if (setup === '/user/profile') {
    return pathname === '/user/profile' || pathname.startsWith('/user/profile/');
  }
  return pathname === setup;
}

/** A role may unlock only one console. pos.sale may sit on Admin or Staff, not Customer. */
export function mixedConsoleMessage(keys: string[]) {
  const hasAccess =
    keys.includes('dashboard.super') ||
    keys.includes('rbac.roles.write') ||
    keys.includes('rbac.users.assign') ||
    keys.includes('*');
  const hasAdmin = keys.includes('dashboard.admin');
  const hasStaff = keys.includes('dashboard.staff');
  const hasCustomer = keys.includes('dashboard.customer');
  if (hasCustomer && (hasAccess || hasAdmin || hasStaff || keys.includes('pos.sale'))) {
    return 'A role cannot mix the customer account with a work console.';
  }
  if (hasAccess && (hasAdmin || hasStaff)) {
    return 'A role cannot mix Super admin with Admin or Staff.';
  }
  if (hasAdmin && hasStaff) {
    return 'A role cannot mix Admin and Staff. Keep the till on Admin, or use Staff.';
  }
  return null;
}

export function canAccessWorkspaceKeys(keys: string[] | undefined | null, id: PrincipalWorkspace) {
  return principalWorkspace(keys) === id;
}

export function effectivePermissionKeys(keys: string[] | undefined | null): string[] {
  const held = keys ?? [];
  if (!held.includes('*')) return held;
  return [...new Set([...held.filter((key) => key !== '*'), ...ACCESS_CONTROL_KEYS])];
}

export function hasAllKeys(keys: string[] | undefined | null, needed: string[]) {
  const held = effectivePermissionKeys(keys);
  return needed.every((key) => held.includes(key));
}

export function hasKey(keys: string[] | undefined | null, needed: string) {
  return hasAllKeys(keys, [needed]);
}

export const SHOPPER_ONLY_MESSAGE = 'Only a customer account can shop or save a wishlist.';

/** Signed-in Super admin, Admin, and Staff cannot shop. Guests pass this check in the guard when there is no user. */
export function isCustomerPrincipal(keys: string[] | undefined | null) {
  return principalWorkspace(keys) === 'customer';
}
