import { describe, expect, it } from 'vitest';
import { zTranslationUpdateSchema } from './translation.zod.js';

describe('zTranslationUpdateSchema', () => {
  it.each(['add-missing', 'update-existing', 'delete-missing-key', 'delete-missing-value'])('accepts %s', type => {
    expect(zTranslationUpdateSchema.safeParse({ type, values: {} }).success).toBe(true);
  });

  // Split into delete-missing-key (every locale) and delete-missing-value (this locale only), so a
  // caller always states the scope; the ambiguous name is gone rather than aliased.
  it('rejects the former delete-missing', () => {
    expect(zTranslationUpdateSchema.safeParse({ type: 'delete-missing', values: {} }).success).toBe(false);
  });
});
