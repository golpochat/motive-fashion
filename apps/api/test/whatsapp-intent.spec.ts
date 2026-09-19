import { describe, expect, it } from 'vitest';
import { decodeWhatsappPicks, decodeWhatsappVariants, encodeWhatsappPicks, encodeWhatsappVariants, whatsappIntent } from '@motive-fashion/utils';

describe('whatsappIntent', () => {
  it('treats greetings and help as the menu', () => {
    expect(whatsappIntent('hi')).toEqual({ type: 'menu' });
    expect(whatsappIntent('Salaam')).toEqual({ type: 'menu' });
    expect(whatsappIntent('MENU')).toEqual({ type: 'menu' });
  });

  it('maps category words and CAT: codes', () => {
    expect(whatsappIntent('hijabs')).toEqual({ type: 'category', slug: 'hijabs' });
    expect(whatsappIntent('jilbab')).toEqual({ type: 'category', slug: 'jilbabs' });
    expect(whatsappIntent('CAT:abayas')).toEqual({ type: 'category', slug: 'abayas' });
  });

  it('adds by slug or numbered pick', () => {
    expect(whatsappIntent('ADD:everyday-chiffon-hijab')).toEqual({
      type: 'add',
      slug: 'everyday-chiffon-hijab',
    });
    expect(whatsappIntent('add black-abaya')).toEqual({ type: 'add', slug: 'black-abaya' });
    expect(whatsappIntent('2')).toEqual({ type: 'pick', index: 1 });
  });

  it('maps cart edits, tracking, and fulfilment words', () => {
    expect(whatsappIntent('basket')).toEqual({ type: 'cart' });
    expect(whatsappIntent('pay now')).toEqual({ type: 'checkout' });
    expect(whatsappIntent('remove')).toEqual({ type: 'remove', index: undefined });
    expect(whatsappIntent('remove 2')).toEqual({ type: 'remove', index: 1 });
    expect(whatsappIntent('qty 3')).toEqual({ type: 'qty', quantity: 3 });
    expect(whatsappIntent('track')).toEqual({ type: 'track' });
    expect(whatsappIntent('collect')).toEqual({ type: 'collection' });
    expect(whatsappIntent('deliver')).toEqual({ type: 'delivery' });
  });

  it('falls through to search for free text', () => {
    expect(whatsappIntent('black hijab')).toEqual({ type: 'search', q: 'black hijab' });
  });

  it('round-trips listed picks on the session', () => {
    expect(encodeWhatsappPicks(['a', 'b'])).toBe('picks:a,b');
    expect(decodeWhatsappPicks('picks:a,b')).toEqual(['a', 'b']);
    expect(decodeWhatsappPicks('CART')).toEqual([]);
  });

  it('round-trips size and colour variant waits', () => {
    expect(encodeWhatsappVariants('silk-abaya', ['a', 'b'])).toBe('vars:silk-abaya|a,b');
    expect(decodeWhatsappVariants('vars:silk-abaya|a,b')).toEqual({ slug: 'silk-abaya', ids: ['a', 'b'] });
  });
});
