import { describe, expect, it } from 'vitest';
import {
  formatCanadianPhone,
  formatCanadianPostalCode,
  formatContactNumber,
  isValidCanadianPhone,
} from '../services/facilityFormatting';

describe('smart facility data-entry formatting', () => {
  it('formats Canadian phone numbers progressively and supports country code', () => {
    expect(formatCanadianPhone('780')).toBe('(780) ');
    expect(formatCanadianPhone('7805550199')).toBe('(780) 555-0199');
    expect(formatCanadianPhone('1 780 555 0199')).toBe('+1 (780) 555-0199');
    expect(formatCanadianPhone('(780) 555-0199 extra digits')).toBe('(780) 555-0199');
    expect(isValidCanadianPhone('(780) 555-0199')).toBe(true);
    expect(isValidCanadianPhone('780-55')).toBe(false);
    expect(isValidCanadianPhone('123-456-7890')).toBe(false);
  });

  it('uppercases and spaces Canadian postal codes', () => {
    expect(formatCanadianPostalCode('t6w2p3')).toBe('T6W 2P3');
    expect(formatCanadianPostalCode('T6W-2P3 extra')).toBe('T6W 2P3');
  });

  it('preserves extension-style quick contacts while formatting full numbers', () => {
    expect(formatContactNumber('ext4021')).toBe('ext 4021');
    expect(formatContactNumber('4035550155')).toBe('(403) 555-0155');
  });
});
