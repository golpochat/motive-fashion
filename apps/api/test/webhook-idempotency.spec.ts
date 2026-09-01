import { describe, expect, it } from 'vitest';

describe('stripe webhook idempotency', () => {
  it('treats duplicate event ids as no-ops', () => {
    const seen = new Set<string>();
    const process = (id: string) => {
      if (seen.has(id)) return 'duplicate';
      seen.add(id);
      return 'processed';
    };
    expect(process('evt_1')).toBe('processed');
    expect(process('evt_1')).toBe('duplicate');
  });
});
