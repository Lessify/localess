/**
 * A form value as a string, for telling whether it changed: empty values (null, undefined, '' and []) are left out, so
 * the same content compares equal however the form was filled (a form built from a stored schema has no control for
 * an unset setting, one built in the editor has it as null).
 */
export function formValueKey(value: unknown): string {
  return JSON.stringify(value, (_key, it: unknown) =>
    it === null || it === '' || (Array.isArray(it) && it.length === 0) ? undefined : it,
  );
}
