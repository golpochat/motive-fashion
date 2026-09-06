import { hasAnyPerm, hasPerm, type Me } from '@/lib/rbac';
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
    nav: [
      { href: '/super-admin', label: 'Overview', icon: 'overview', exact: true, section: 'Access' },
      { href: '/super-admin/roles', label: 'Roles', icon: 'roles', perm: 'rbac.roles.write', section: 'Access' },
      { href: '/super-admin/users', label: 'Users', icon: 'users', perm: 'rbac.users.assign', section: 'Access' },
      { href: '/super-admin/permissions', label: 'Permissions', icon: 'permissions', perm: 'rbac.roles.write', section: 'Access' },
    ],
  },
  {
    id: 'admin',
    href: '/admin',
    label: 'Admin',
    eyebrow: 'Commerce',
    description: 'Merchandising, customers, supply, and marketing.',
    match: ['/admin'],
    nav: [
      { href: '/admin', label: 'Overview', icon: 'overview', exact: true, perm: 'analytics.read', section: 'Commerce' },
      { href: '/admin/products', label: 'Products', icon: 'products', perm: 'catalog.read', section: 'Commerce' },
      { href: '/admin/inventory', label: 'Inventory', icon: 'inventory', perm: 'inventory.read', section: 'Commerce' },
      { href: '/admin/orders', label: 'Orders', icon: 'orders', perm: 'orders.read', section: 'Commerce' },
      { href: '/admin/checkout', label: 'Checkout', icon: 'locations', perm: 'commerce.settings', section: 'Commerce' },
      { href: '/admin/customers', label: 'Customers', icon: 'customers', perm: 'customers.read', section: 'Commerce' },
      { href: '/admin/locations', label: 'Locations', icon: 'locations', perm: 'locations.read', section: 'Operations' },
      { href: '/admin/pos', label: 'POS', icon: 'pos', perm: 'pos.sale', section: 'Operations' },
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
    nav: [
      { href: '/staff', label: 'Overview', icon: 'overview', exact: true, section: 'Floor' },
      { href: '/staff/pos', label: 'POS', icon: 'pos', perm: 'pos.sale', section: 'Floor' },
      { href: '/staff/inventory', label: 'Inventory', icon: 'inventory', perm: 'inventory.read', section: 'Floor' },
      { href: '/staff/orders', label: 'Orders', icon: 'orders', perm: 'orders.read', section: 'Floor' },
      { href: '/staff/locations', label: 'Locations', icon: 'locations', perm: 'locations.read', section: 'Floor' },
    ],
  },
  {
    id: 'customer',
    href: '/user',
    label: 'Account',
    eyebrow: 'Customer',
    description: 'Orders, wishlist, profile, addresses, and privacy.',
    match: ['/user'],
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
  if (id === 'staff') return hasPerm(me, 'dashboard.staff');
  return true;
}

export function accessibleWorkspaces(me: Me | null | undefined) {
  return WORKSPACES.filter((w) => canAccessWorkspace(me, w.id));
}

export function navActive(pathname: string, item: NavItem) {
  if (item.exact) return pathname === item.href;
  return pathname === item.href || pathname.startsWith(`${item.href}/`);
}
