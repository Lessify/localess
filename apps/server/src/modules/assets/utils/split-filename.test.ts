import { describe, expect, it } from 'vitest';

import { splitFilename } from './split-filename.js';

describe('splitFilename', () => {
  it('splits at the last dot, keeping the extension as written', () => {
    expect(splitFilename('photo.final.JPG')).toEqual({ name: 'photo.final', extension: '.JPG' });
    expect(splitFilename('archive.tar.gz')).toEqual({ name: 'archive.tar', extension: '.gz' });
  });

  it('gives no extension to a name without a dot, or a dotfile', () => {
    expect(splitFilename('README')).toEqual({ name: 'README', extension: '' });
    expect(splitFilename('.gitignore')).toEqual({ name: '.gitignore', extension: '' });
  });

  it('keeps a trailing dot as the extension', () => {
    expect(splitFilename('notes.')).toEqual({ name: 'notes', extension: '.' });
  });
});
