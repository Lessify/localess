import { describe, expect, it } from 'vitest';

import { formValueKey } from './form-value';

describe('formValueKey', () => {
  it('leaves out empty values: null, undefined, empty text and empty lists', () => {
    expect(formValueKey({ name: 'title', displayName: null, description: '', labels: [], required: undefined })).toBe(
      formValueKey({ name: 'title' }),
    );
  });

  it('leaves them out at any depth', () => {
    expect(formValueKey({ fields: [{ name: 'title', translatable: null }] })).toBe(formValueKey({ fields: [{ name: 'title' }] }));
  });

  it('tells a changed value apart', () => {
    expect(formValueKey({ displayName: 'Sent' })).not.toBe(formValueKey({ displayName: 'Typed while saving' }));
    expect(formValueKey({ required: false })).not.toBe(formValueKey({}));
    expect(formValueKey({ fields: [{ name: 'a' }, { name: 'b' }] })).not.toBe(formValueKey({ fields: [{ name: 'b' }, { name: 'a' }] }));
  });
});
