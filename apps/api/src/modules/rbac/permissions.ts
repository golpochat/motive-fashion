import { ACCESS_CONTROL_KEYS, hasAllKeys, principalWorkspace } from '@motive-fashion/utils';

export const PERMISSION_CATALOG = [
  { key: '*', name: 'Access-control wildcard', group: 'System' },
  { key: 'dashboard.super', name: 'Open super-admin console', group: 'Dashboards' },
  { key: 'dashboard.admin', name: 'Open admin console', group: 'Dashboards' },
  { key: 'dashboard.staff', name: 'Open staff console', group: 'Dashboards' },
  { key: 'dashboard.customer', name: 'Open customer account', group: 'Dashboards' },
  { key: 'rbac.roles.write', name: 'Create and edit roles', group: 'Access' },
  { key: 'rbac.users.assign', name: 'Assign roles to users', group: 'Access' },
  { key: 'analytics.read', name: 'View analytics', group: 'Commerce' },
  { key: 'catalog.read', name: 'View products', group: 'Commerce' },
  { key: 'catalog.write', name: 'Create and edit products', group: 'Commerce' },
  { key: 'inventory.read', name: 'View inventory', group: 'Shop floor' },
  { key: 'inventory.adjust', name: 'Adjust and transfer stock', group: 'Shop floor' },
  { key: 'orders.read', name: 'View orders', group: 'Shop floor' },
  { key: 'orders.pack', name: 'Change order status', group: 'Shop floor' },
  { key: 'orders.refund', name: 'Issue refunds', group: 'Commerce' },
  { key: 'customers.read', name: 'View customers', group: 'Commerce' },
  { key: 'procurement.write', name: 'Suppliers and purchase orders', group: 'Commerce' },
  { key: 'locations.read', name: 'View locations', group: 'Shop floor' },
  { key: 'pos.sale', name: 'Take POS sales', group: 'Shop floor' },
  { key: 'commerce.settings', name: 'Edit checkout methods and county rates', group: 'Commerce' },
  { key: 'marketing.write', name: 'Marketing calendar and coupons', group: 'Commerce' },
  { key: 'whatsapp.broadcast', name: 'WhatsApp broadcast', group: 'Commerce' },
  { key: 'reviews.moderate', name: 'Moderate product reviews', group: 'Commerce' },
  { key: 'audit.read', name: 'View audit log', group: 'Access' },
] as const;

export type PermissionKey = (typeof PERMISSION_CATALOG)[number]['key'];

export const CATALOG_KEYS = new Set<string>(PERMISSION_CATALOG.map((p) => p.key));

export function hasAll(keys: string[], needed: string[]) {
  return hasAllKeys(keys, needed);
}

export const SYSTEM_ROLE_SLUGS = ['super-admin', 'admin', 'staff', 'customer'] as const;

export const LOCKED_PERMISSION_KEYS = ['*', 'dashboard.super'] as const;

export const HIDDEN_ROLE_SLUG = 'super-admin';

export function isLockedPermission(key: string) {
  return (LOCKED_PERMISSION_KEYS as readonly string[]).includes(key);
}

export function isCommerceAdminKeys(keys: string[]) {
  return principalWorkspace(keys) === 'admin';
}

/** True when this assignment would leave the shop with no visible commerce admin. */
export function lastCommerceAdminBlocked(currentlyAdmin: boolean, nextIsAdmin: boolean, otherAdmins: number) {
  return currentlyAdmin && !nextIsAdmin && otherAdmins < 1;
}

export function systemRoleRequiredKeys(slug: string): string[] {
  if (slug === 'admin') return ['dashboard.admin'];
  if (slug === 'staff') return ['dashboard.staff'];
  if (slug === 'customer') return ['dashboard.customer'];
  return [];
}

export function slugifyRole(name: string) {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export const ROLE_PERMISSIONS: Record<(typeof SYSTEM_ROLE_SLUGS)[number], PermissionKey[]> = {
  'super-admin': [...ACCESS_CONTROL_KEYS],
  admin: [
    'dashboard.admin',
    'analytics.read',
    'catalog.read',
    'catalog.write',
    'inventory.read',
    'inventory.adjust',
    'orders.read',
    'orders.pack',
    'orders.refund',
    'customers.read',
    'procurement.write',
    'locations.read',
    'pos.sale',
    'commerce.settings',
    'marketing.write',
    'whatsapp.broadcast',
    'reviews.moderate',
    'audit.read',
  ],
  staff: [
    'dashboard.staff',
    'inventory.read',
    'inventory.adjust',
    'orders.read',
    'orders.pack',
    'locations.read',
    'pos.sale',
  ],
  customer: ['dashboard.customer'],
};
