import { hasAnyPerm, hasPerm, isCommerceAdmin, type Me } from '@/lib/rbac';
import type { IconName } from '@/components/icons';

export type NavItem = {
  href: string;
  label: string;
  icon: IconName;
  perm?: string;
  exact?: boolean;
  section: string;
};

export type WorkspaceId = 'super-admin' | 'admin' | 'staff' | 'customer';

export type Workspace = {
  id: WorkspaceId;
  href: string;
  label: string;
  eyebrow: string;
  description: string;
  match: string[];
  icon: IconName;
  nav: NavItem[];
};

export const WORKSPACES: Workspace[] = [
  {
    id: 'super-admin',
    href: '/super-admin',
    label: 'Super admin',
    eyebrow: 'Access control',
    description: 'Roles, people, and the permission catalog.',
    match: ['/super-admin'],
    icon: 'permissions',
    nav: [
      { href: '/super-admin', label: 'Overview', icon: 'overview', exact: true, section: 'Access' },
      { href: '/super-admin/roles', label: 'Roles', icon: 'roles', perm: 'rbac.roles.write', section: 'Access' },
      { href: '/super-admin/users', label: 'Users', icon: 'users', perm: 'rbac.users.assign', section: 'Access' },
      { href: '/super-admin/permissions', label: 'Permissions', icon: 'permissions', perm: 'rbac.roles.write', section: 'Access' },
      { href: '/super-admin/audit', label: 'Audit', icon: 'permissions', perm: 'audit.read', section: 'Access' },
    ],
  },
  {
    id: 'admin',
    href: '/admin',
    label: 'Admin',
    eyebrow: 'Commerce',
    description: 'Merchandising, customers, supply, and marketing.',
    match: ['/admin'],
    icon: 'building',
    nav: [
      { href: '/admin', label: 'Overview', icon: 'overview', exact: true, perm: 'analytics.read', section: 'Commerce' },
      { href: '/admin/products', label: 'Products', icon: 'products', perm: 'catalog.read', section: 'Commerce' },
      { href: '/admin/labels', label: 'Labels', icon: 'products', perm: 'catalog.read', section: 'Commerce' },
      { href: '/admin/inventory', label: 'Inventory', icon: 'inventory', perm: 'inventory.read', section: 'Commerce' },
      { href: '/admin/orders', label: 'Orders', icon: 'orders', perm: 'orders.read', section: 'Commerce' },
      { href: '/admin/customers', label: 'Customers', icon: 'customers', perm: 'customers.read', section: 'Commerce' },
      { href: '/admin/returns', label: 'Returns', icon: 'orders', perm: 'orders.read', section: 'Commerce' },
      { href: '/admin/refunds', label: 'Refunds', icon: 'orders', perm: 'orders.refund', section: 'Commerce' },
      { href: '/admin/reviews', label: 'Reviews', icon: 'products', perm: 'reviews.moderate', section: 'Commerce' },
      { href: '/admin/coupons', label: 'Coupons', icon: 'coupon', perm: 'marketing.write', section: 'Commerce' },
      { href: '/admin/checkout', label: 'Checkout', icon: 'checkout', perm: 'commerce.settings', section: 'Operations' },
      { href: '/admin/pos', label: 'POS', icon: 'pos', perm: 'pos.sale', section: 'Operations' },
      { href: '/admin/locations', label: 'Locations', icon: 'locations', perm: 'locations.read', section: 'Operations' },
      { href: '/admin/audit', label: 'Audit', icon: 'permissions', perm: 'audit.read', section: 'Operations' },
      { href: '/admin/suppliers', label: 'Suppliers', icon: 'suppliers', perm: 'procurement.write', section: 'Supply' },
      { href: '/admin/procurement', label: 'Procurement', icon: 'procurement', perm: 'procurement.write', section: 'Supply' },
      { href: '/admin/marketing', label: 'Marketing', icon: 'marketing', perm: 'marketing.write', section: 'Growth' },
      { href: '/admin/whatsapp', label: 'WhatsApp', icon: 'whatsapp', perm: 'whatsapp.broadcast', section: 'Growth' },
    ],
  },
  {
    id: 'staff',
    href: '/staff',
    label: 'Staff',
    eyebrow: 'Shop floor',
    description: 'Till, stock, packing, and locations.',
    match: ['/staff'],
    icon: 'pos',
    nav: [
      { href: '/staff', label: 'Overview', icon: 'overview', exact: true, section: 'Shop floor' },
      { href: '/staff/pos', label: 'POS', icon: 'pos', perm: 'pos.sale', section: 'Shop floor' },
      { href: '/staff/orders', label: 'Orders', icon: 'orders', perm: 'pos.sale', section: 'Shop floor' },
      { href: '/staff/pack', label: 'Pack', icon: 'orders', perm: 'orders.pack', section: 'Shop floor' },
      { href: '/staff/inventory', label: 'Inventory', icon: 'inventory', perm: 'inventory.read', section: 'Shop floor' },
      { href: '/staff/locations', label: 'Locations', icon: 'locations', perm: 'locations.read', section: 'Shop floor' },
    ],
  },
  {
    id: 'customer',
    href: '/user',
    label: 'Account',
    eyebrow: 'Customer',
    description: 'Orders, wishlist, profile, addresses, and privacy.',
    match: ['/user'],
    icon: 'profile',
    nav: [
      { href: '/user', label: 'Overview', icon: 'overview', exact: true, section: 'Account' },
      { href: '/user/orders', label: 'Orders', icon: 'orders', section: 'Account' },
      { href: '/user/wishlist', label: 'Wishlist', icon: 'wishlist', section: 'Account' },
      { href: '/user/profile', label: 'Profile', icon: 'profile', section: 'Account' },
      { href: '/user/addresses', label: 'Addresses', icon: 'locations', section: 'Account' },
      { href: '/user/privacy', label: 'Privacy', icon: 'privacy', section: 'Account' },
    ],
  },
];

export function workspaceById(id: WorkspaceId) {
  return WORKSPACES.find((w) => w.id === id)!;
}

export function workspaceFromPath(pathname: string) {
  return WORKSPACES.find((w) => w.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)));
}

export function canAccessWorkspace(me: Me | null | undefined, id: WorkspaceId) {
  if (!me) return false;
  if (id === 'super-admin') return hasAnyPerm(me, ['dashboard.super', 'rbac.roles.write']);
  if (id === 'admin') return hasPerm(me, 'dashboard.admin');
  if (id === 'staff') {
    if (isCommerceAdmin(me)) return false;
    return hasPerm(me, 'dashboard.staff') || hasPerm(me, 'pos.sale');
  }
  return true;
}

export function homeWorkspace(me: Me | null | undefined): WorkspaceId {
  if (canAccessWorkspace(me, 'super-admin')) return 'super-admin';
  if (canAccessWorkspace(me, 'admin')) return 'admin';
  if (canAccessWorkspace(me, 'staff')) return 'staff';
  return 'customer';
}

export function accessibleWorkspaces(me: Me | null | undefined) {
  const operational = homeWorkspace(me) !== 'customer';
  return WORKSPACES.filter((w) => {
    if (!canAccessWorkspace(me, w.id)) return false;
    if (w.id === 'customer' && operational) return false;
    return true;
  });
}

export function navActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
