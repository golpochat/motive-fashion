import { describe, expect, it } from 'vitest';
import { addressLabelCode, addressLabelName, isValidEircode, normalizeEircode } from '@motive-fashion/config';
import { addressCreateSchema } from '@motive-fashion/validation';
import { zodClientMessage } from '../src/common/zod-message';

describe('Ireland Eircode', () => {
  it('normalises spacing and case', () => {
    expect(normalizeEircode('d02af30')).toBe('D02 AF30');
    expect(normalizeEircode('D6W1234')).toBe('D6W 1234');
  });

  it('accepts routing keys including D6W', () => {
    expect(isValidEircode('D02 AF30')).toBe(true);
    expect(isValidEircode('d02af30')).toBe(true);
    expect(isValidEircode('D6W AB12')).toBe(true);
    expect(isValidEircode('D02')).toBe(false);
    expect(isValidEircode('')).toBe(false);
  });
});

describe('address labels', () => {
  it('maps legacy free-text names onto the preset list', () => {
    expect(addressLabelCode('Home')).toBe('HOME');
    expect(addressLabelCode('work')).toBe('WORK');
    expect(addressLabelCode('Cottage')).toBe('OTHER');
    expect(addressLabelName('HOME')).toBe('Home');
    expect(addressLabelName('Family')).toBe('Family');
  });
});

describe('address create messages', () => {
  it('names the missing field instead of Validation failed', () => {
    const result = addressCreateSchema.safeParse({
      eircode: 'D14X289',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    const messages = result.error.issues.map((issue) => issue.message);
    expect(messages).toContain('Enter the first line of the address.');
    expect(messages).toContain('Enter a town or city.');
    expect(messages).toContain('Choose a county.');
    expect(zodClientMessage(result.error)).not.toBe('Validation failed');
  });

  it('asks for a real Eircode when the routing key is incomplete', () => {
    const result = addressCreateSchema.safeParse({
      label: 'HOME',
      line1: '14 Main Street',
      city: 'Dublin',
      county: 'DUBLIN',
      eircode: 'D14',
    });
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(zodClientMessage(result.error)).toBe('Enter a valid Eircode, like D02 AF30.');
  });
});
