import { describe, expect, it } from 'vitest';
import { hasAll, isLockedPermission, slugifyRole } from '../src/modules/rbac/permissions';

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

describe('role slugs', () => {
  it('builds a url-safe slug from a display name', () => {
    expect(slugifyRole('Shop Floor Lead')).toBe('shop-floor-lead');
    expect(isLockedPermission('*')).toBe(true);
    expect(isLockedPermission('dashboard.super')).toBe(true);
    expect(isLockedPermission('catalog.write')).toBe(false);
  });
});
