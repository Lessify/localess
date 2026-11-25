import { describe, expect, it } from 'vitest';

import { zBoolean } from './common.zod.js';

describe('zBoolean', () => {
  it('reads exactly "true" and "false" as booleans', () => {
    expect(zBoolean.parse('true')).toBe(true);
    expect(zBoolean.parse('false')).toBe(false);
  });

  it('refuses anything else, "1", "yes" and the empty string included', () => {
    for (const value of ['1', '0', 'yes', 'no', 'on', 'TRUE', '', 'maybe']) expect(zBoolean.safeParse(value).success, value).toBe(false);
  });

  it('defaults when absent', () => {
    expect(zBoolean.default(true).parse(undefined)).toBe(true);
  });
});
