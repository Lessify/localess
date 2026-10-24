/** A name as part of a download's file name: lower case, letters and digits, dashes between (`My Site!` → `my-site`). */
export function toFileName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'space'
  );
}

const WINDOWS_RESERVED = /^(con|prn|aux|nul|com[0-9]|lpt[0-9])$/i;
const MAX_FILE_NAME = 150;
/** The extension: one or two short ASCII parts at the end (`.json`, `.localess.zip`, `.llt.zip`). */
const EXTENSION = /(?:\.[A-Za-z0-9]{1,10}){1,2}$/;

/**
 * A file name safe as the last segment of a storage key on any filesystem (and an object store). The extension is kept
 * apart and whole, so the name still says what the file is: the last path segment only, spaces around it trimmed; in the
 * base name, letters, digits, `.`, `_` and `-` kept and any other run of characters (letters outside ASCII included)
 * one `-`, no leading dot or dash, a Windows reserved name prefixed with `_`, `file` when nothing is left
 * (`переводы.json` → `file.json`); at most 150 characters, cut from the base.
 */
export function sanitizeFileName(name: string): string {
  const last = (name.split(/[\\/]/).pop() ?? '').trim();
  const extension = EXTENSION.exec(last)?.[0] ?? '';
  let base = last
    .slice(0, last.length - extension.length)
    .replace(/[^A-Za-z0-9._-]+/g, '-')
    .replace(/^[.-]+/, '');
  if (!base) base = 'file';
  if (WINDOWS_RESERVED.test(base)) base = `_${base}`;
  return base.slice(0, MAX_FILE_NAME - extension.length) + extension;
}
