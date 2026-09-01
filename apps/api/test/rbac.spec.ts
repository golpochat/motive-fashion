import { describe, expect, it } from 'vitest';
import { hasAll } from '../src/modules/rbac/permissions';

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
