import { describe, expect, it } from 'vitest';

import { sanitizeFileName, toFileName } from './file-name.js';

describe('toFileName', () => {
  it('keeps letters and digits, dashes between, nothing at the ends', () => {
    expect(toFileName('My Site! 2026')).toBe('my-site-2026');
    expect(toFileName('***')).toBe('space');
  });
});

describe('sanitizeFileName', () => {
  it('keeps the last path segment only', () => {
    expect(sanitizeFileName('C:\\Users\\me\\de.json')).toBe('de.json');
    expect(sanitizeFileName('../../x.json')).toBe('x.json');
  });
  it('keeps letters, digits, dot, dash and underscore; any other run becomes one dash', () => {
    expect(sanitizeFileName('My File (1).json')).toBe('My-File-1-.json');
    expect(sanitizeFileName('a<b>c:d"e|f?g*h.json')).toBe('a-b-c-d-e-f-g-h.json');
    expect(sanitizeFileName('Übersetzung.json')).toBe('bersetzung.json');
  });
  it('can not be hidden or start with dots or dashes', () => {
    expect(sanitizeFileName('.env')).toBe('file.env');
    expect(sanitizeFileName('..json')).toBe('file.json');
    expect(sanitizeFileName('--x.json')).toBe('x.json');
  });
  it('prefixes a Windows reserved name', () => {
    expect(sanitizeFileName('CON.json')).toBe('_CON.json');
    expect(sanitizeFileName('com1')).toBe('_com1');
  });
  it('keeps at most 150 characters, cutting the base name so the extension stays', () => {
    const name = sanitizeFileName(`${'a'.repeat(200)}.localess.zip`);
    expect(name).toHaveLength(150);
    expect(name.endsWith('.localess.zip')).toBe(true);
  });
  it('keeps the extension of a name in another script, the base becoming "file"', () => {
    expect(sanitizeFileName('переводы.json')).toBe('file.json');
    expect(sanitizeFileName('翻訳.localess.zip')).toBe('file.localess.zip');
    expect(sanitizeFileName('Перевод сайта v2.llt.zip')).toBe('v2.llt.zip');
  });

  it('keeps the extension of a long name with a dot early in it', () => {
    const name = sanitizeFileName(`v2.1 ${'a'.repeat(200)}.localess.zip`);
    expect(name).toHaveLength(150);
    expect(name.endsWith('.localess.zip')).toBe(true);
  });

  it('ignores spaces around the name', () => {
    expect(sanitizeFileName(' de.json ')).toBe('de.json');
  });

  it('falls back to "file"', () => {
    expect(sanitizeFileName('???')).toBe('file');
    expect(sanitizeFileName('')).toBe('file');
  });
});
