import { describe, expect, it } from 'vitest';
import { isUnsafeAttentionPattern, validateAttentionPattern, detectAttentionIndicators } from '../services/attention';
import { FacilityAttentionRule } from '../types';

describe('attention rule pattern safety (ReDoS guard)', () => {
  it.each([
    '(a+)+',
    '(\\w+)*',
    '([a-z]+){2,}',
    '(insulin+)+',
  ])('flags the catastrophic-backtracking shape in %s', pattern => {
    expect(isUnsafeAttentionPattern(pattern)).toBe(true);
  });

  it.each([
    '\\b(insulin|glargine)\\b',
    'prn.*effectiveness',
    '(pain reassess(ment)?)',
    'bg|blood glucose',
  ])('does not flag ordinary facility patterns like %s', pattern => {
    expect(isUnsafeAttentionPattern(pattern)).toBe(false);
  });

  it('rejects an unsafe pattern at validation time with a clear message', () => {
    expect(validateAttentionPattern('(a+)+')).toMatch(/nested repeated group/i);
    expect(validateAttentionPattern('')).toMatch(/cannot be empty/i);
    expect(validateAttentionPattern('[unclosed')).toMatch(/not a valid pattern/i);
    expect(validateAttentionPattern('\\binsulin\\b')).toBeNull();
  });

  it('skips an unsafe rule during live detection instead of evaluating it', () => {
    const rules: FacilityAttentionRule[] = [
      { id: 'r1', name: 'Unsafe', pattern: '(a+)+$', indicators: ['HIGH_ALERT'], isActive: true, isSystem: false },
    ];
    const result = detectAttentionIndicators('aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaab', undefined, rules);
    expect(result.suggestedIndicators).toEqual([]);
  });
});
