import { describe, expect, it } from 'vitest';
import { isStaffWorkspace, staffMfaRequired } from '../src/common/security-config';
import { unwrapCatalogList } from '@motive-fashion/utils';
import { collectionAllowedOnChannel } from '../src/modules/commerce/commerce.service';
import { SalesChannel } from '@prisma/client';

describe('staff MFA policy', () => {
  it('is on in production unless explicitly disabled', () => {
    expect(staffMfaRequired({ NODE_ENV: 'production' })).toBe(true);
    expect(staffMfaRequired({ NODE_ENV: 'production', REQUIRE_STAFF_MFA: 'false' })).toBe(false);
  });

  it('is off in development unless explicitly enabled', () => {
    expect(staffMfaRequired({ NODE_ENV: 'development' })).toBe(false);
    expect(staffMfaRequired({ NODE_ENV: 'development', REQUIRE_STAFF_MFA: 'true' })).toBe(true);
  });

  it('treats dashboard and till keys as staff workspace', () => {
    expect(isStaffWorkspace(['dashboard.admin'])).toBe(true);
    expect(isStaffWorkspace(['pos.sale'])).toBe(true);
    expect(isStaffWorkspace(['dashboard.customer'])).toBe(false);
  });
});

describe('catalog list envelope', () => {
  it('unwraps a cursor page and a legacy array', () => {
    expect(unwrapCatalogList<{ id: string }>({ items: [{ id: 'a' }], nextCursor: 'x' })).toEqual({
      items: [{ id: 'a' }],
      nextCursor: 'x',
    });
    expect(unwrapCatalogList<{ id: string }>([{ id: 'b' }])).toEqual({ items: [{ id: 'b' }], nextCursor: null });
  });
});

describe('collection availability', () => {
  it('is offered on every sales channel when the method is published', () => {
    expect(collectionAllowedOnChannel(SalesChannel.POS)).toBe(true);
    expect(collectionAllowedOnChannel(SalesChannel.WHATSAPP)).toBe(true);
    expect(collectionAllowedOnChannel(SalesChannel.WEB)).toBe(true);
    expect(collectionAllowedOnChannel(SalesChannel.MOBILE)).toBe(true);
  });
});
