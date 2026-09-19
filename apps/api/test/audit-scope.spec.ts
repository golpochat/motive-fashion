import { describe, expect, it } from 'vitest';
import { auditScopeWhere } from '../src/common/audit';

describe('audit scopes', () => {
  it('keeps role and assignment writes on access control', () => {
    expect(auditScopeWhere('access')).toEqual({
      OR: [{ entity: { in: ['Role', 'Permission'] } }, { action: { startsWith: 'rbac.' } }],
    });
  });

  it('excludes access-control rows from commerce', () => {
    expect(auditScopeWhere('commerce')).toEqual({
      NOT: {
        OR: [{ entity: { in: ['Role', 'Permission'] } }, { action: { startsWith: 'rbac.' } }],
      },
    });
  });
});
