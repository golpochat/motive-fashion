import { describe, expect, it } from 'vitest';
import { hasAll, isLockedPermission, ROLE_PERMISSIONS, slugifyRole } from '../src/modules/rbac/permissions';

describe('RBAC hasAll', () => {
  it('lets * satisfy any required keys', () => {
    expect(hasAll(['*'], ['rbac.roles.write', 'pos.sale'])).toBe(true);
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
});

describe('role slugs', () => {
  it('builds a url-safe slug from a display name', () => {
    expect(slugifyRole('Shop Floor Lead')).toBe('shop-floor-lead');
    expect(isLockedPermission('*')).toBe(true);
    expect(isLockedPermission('dashboard.super')).toBe(true);
    expect(isLockedPermission('catalog.write')).toBe(false);
  });
});
