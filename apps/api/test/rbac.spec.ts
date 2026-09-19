import { describe, expect, it } from 'vitest';
import { canAccessWorkspaceKeys, hasAllKeys, isCustomerPrincipal, mfaSetupPath, mixedConsoleMessage, principalWorkspace } from '@motive-fashion/utils';
import { hasAll, isCommerceAdminKeys, isLockedPermission, lastCommerceAdminBlocked, ROLE_PERMISSIONS, slugifyRole, systemRoleRequiredKeys } from '../src/modules/rbac/permissions';

describe('RBAC hasAll', () => {
  it('does not let * open another principal’s keys', () => {
    expect(hasAll(['*'], ['rbac.roles.write'])).toBe(true);
    expect(hasAll(['*'], ['pos.sale'])).toBe(false);
    expect(hasAllKeys(['*'], ['catalog.write'])).toBe(false);
  });

  it('requires every listed key when there is no *', () => {
    expect(hasAll(['dashboard.staff', 'pos.sale'], ['pos.sale'])).toBe(true);
    expect(hasAll(['dashboard.staff'], ['pos.sale'])).toBe(false);
    expect(hasAll(['pos.sale'], ['pos.sale', 'orders.pack'])).toBe(false);
  });
});

describe('system roles', () => {
  it('keeps the till on admin without opening the staff workspace', () => {
    expect(ROLE_PERMISSIONS.admin).toContain('pos.sale');
    expect(ROLE_PERMISSIONS.admin).not.toContain('dashboard.staff');
    expect(ROLE_PERMISSIONS.staff).toContain('dashboard.staff');
  });

  it('keeps super-admin on access control only', () => {
    expect(ROLE_PERMISSIONS['super-admin']).toEqual([
      'dashboard.super',
      'rbac.roles.write',
      'rbac.users.assign',
      'audit.read',
    ]);
    expect(ROLE_PERMISSIONS['super-admin']).not.toContain('*');
    expect(ROLE_PERMISSIONS['super-admin']).not.toContain('dashboard.admin');
    expect(ROLE_PERMISSIONS['super-admin']).not.toContain('pos.sale');
  });
});

describe('exclusive workspaces', () => {
  it('maps each principal to one console', () => {
    expect(principalWorkspace(['dashboard.super', 'rbac.roles.write'])).toBe('super-admin');
    expect(principalWorkspace(['*'])).toBe('super-admin');
    expect(principalWorkspace(['dashboard.admin', 'pos.sale'])).toBe('admin');
    expect(principalWorkspace(['dashboard.staff', 'pos.sale'])).toBe('staff');
    expect(principalWorkspace(['dashboard.customer'])).toBe('customer');
  });

  it('lets guests and customers shop, not work principals', () => {
    expect(isCustomerPrincipal(['dashboard.customer'])).toBe(true);
    expect(isCustomerPrincipal([])).toBe(true);
    expect(isCustomerPrincipal(['dashboard.admin', 'pos.sale'])).toBe(false);
    expect(isCustomerPrincipal(['dashboard.staff'])).toBe(false);
    expect(isCustomerPrincipal(['dashboard.super'])).toBe(false);
  });

  it('refuses other principals’ consoles', () => {
    const superKeys = ['dashboard.super', 'rbac.roles.write', 'rbac.users.assign', 'audit.read'];
    expect(canAccessWorkspaceKeys(superKeys, 'super-admin')).toBe(true);
    expect(canAccessWorkspaceKeys(superKeys, 'admin')).toBe(false);
    expect(canAccessWorkspaceKeys(superKeys, 'staff')).toBe(false);
    expect(canAccessWorkspaceKeys(superKeys, 'customer')).toBe(false);
    expect(canAccessWorkspaceKeys(['dashboard.admin', 'pos.sale'], 'staff')).toBe(false);
    expect(canAccessWorkspaceKeys(['dashboard.staff', 'pos.sale'], 'admin')).toBe(false);
  });

  it('keeps MFA setup on the principal’s console', () => {
    expect(mfaSetupPath(['dashboard.super'])).toBe('/super-admin/security');
    expect(mfaSetupPath(['dashboard.admin'])).toBe('/admin/security');
    expect(mfaSetupPath(['dashboard.staff'])).toBe('/staff/security');
    expect(mfaSetupPath(['dashboard.customer'])).toBe('/user/profile');
  });

  it('refuses mixing consoles on one role', () => {
    expect(mixedConsoleMessage([...ROLE_PERMISSIONS.admin])).toBeNull();
    expect(mixedConsoleMessage([...ROLE_PERMISSIONS.staff])).toBeNull();
    expect(mixedConsoleMessage([...ROLE_PERMISSIONS.customer])).toBeNull();
    expect(mixedConsoleMessage([...ROLE_PERMISSIONS['super-admin']])).toBeNull();
    expect(mixedConsoleMessage(['rbac.roles.write', 'dashboard.admin'])).toMatch(/Super admin/);
    expect(mixedConsoleMessage(['dashboard.admin', 'dashboard.staff'])).toMatch(/Admin and Staff/);
    expect(mixedConsoleMessage(['dashboard.customer', 'pos.sale'])).toMatch(/customer account/);
    expect(mixedConsoleMessage(['dashboard.admin', 'pos.sale'])).toBeNull();
  });
});

describe('role slugs', () => {
  it('builds a url-safe slug from a display name', () => {
    expect(slugifyRole('Shop Floor Lead')).toBe('shop-floor-lead');
    expect(isLockedPermission('*')).toBe(true);
    expect(isLockedPermission('dashboard.super')).toBe(true);
    expect(isLockedPermission('catalog.write')).toBe(false);
  });
});

describe('last commerce admin', () => {
  it('blocks demoting the last visible admin', () => {
    expect(lastCommerceAdminBlocked(true, false, 0)).toBe(true);
    expect(lastCommerceAdminBlocked(true, false, 1)).toBe(false);
    expect(lastCommerceAdminBlocked(true, true, 0)).toBe(false);
    expect(lastCommerceAdminBlocked(false, false, 0)).toBe(false);
  });

  it('treats commerce admin as dashboard.admin only', () => {
    expect(isCommerceAdminKeys(['*'])).toBe(false);
    expect(isCommerceAdminKeys(['dashboard.admin'])).toBe(true);
    expect(isCommerceAdminKeys(['dashboard.staff'])).toBe(false);
    expect(isCommerceAdminKeys(['dashboard.super'])).toBe(false);
  });

  it('keeps console keys on system roles', () => {
    expect(systemRoleRequiredKeys('admin')).toEqual(['dashboard.admin']);
    expect(systemRoleRequiredKeys('staff')).toEqual(['dashboard.staff']);
    expect(systemRoleRequiredKeys('customer')).toEqual(['dashboard.customer']);
    expect(systemRoleRequiredKeys('buyer')).toEqual([]);
  });
});
