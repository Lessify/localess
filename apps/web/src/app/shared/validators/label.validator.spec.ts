import { LabelValidator } from './label.validator';

describe('LabelValidator', () => {
  it('refuses spaces, fewer than 2 or more than 50 characters, and a label already added', () => {
    expect(LabelValidator.error('a b', [])).toBe('A label can not contain spaces.');
    expect(LabelValidator.error('a', [])).toBe('A label needs at least 2 characters.');
    expect(LabelValidator.error('x'.repeat(51), [])).toBe('A label can have at most 50 characters.');
    expect(LabelValidator.error('ui', ['ui'])).toBe("'ui' is already added.");
  });

  it('accepts a well-formed new label', () => {
    expect(LabelValidator.error('label', ['other'])).toBeUndefined();
  });
});
