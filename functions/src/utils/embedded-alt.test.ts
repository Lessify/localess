import { describe, expect, it } from 'vitest';

import { pickEmbeddedAlt } from './embedded-alt';

describe('pickEmbeddedAlt', () => {
  describe('seeds from an embedded caption when the asset has none', () => {
    it('reads the EXIF ImageDescription a camera export carries', () => {
      expect(pickEmbeddedAlt({ ImageDescription: 'Sunrise over the harbour' })).toBe('Sunrise over the harbour');
    });

    it('reads the IPTC caption a press or stock photo carries', () => {
      expect(pickEmbeddedAlt({ 'Caption-Abstract': 'Crowds gather in the square' })).toBe('Crowds gather in the square');
    });

    it('prefers XMP over IPTC over EXIF, since that is the order tooling writes them', () => {
      const tags = {
        Description: 'from xmp',
        'Caption-Abstract': 'from iptc',
        ImageDescription: 'from exif',
      };

      expect(pickEmbeddedAlt(tags)).toBe('from xmp');
    });

    it('falls through to the next tag when the preferred one is empty', () => {
      expect(pickEmbeddedAlt({ Description: '   ', ImageDescription: 'from exif' })).toBe('from exif');
    });

    it('trims surrounding whitespace', () => {
      expect(pickEmbeddedAlt({ ImageDescription: '  a caption  ' })).toBe('a caption');
    });
  });

  describe('never overwrites what an editor wrote', () => {
    // This runs on regeneration too, not only on upload, so an asset whose alt was written by
    // hand months ago must not be clobbered by whatever the file happens to carry.
    it('leaves an existing alt alone', () => {
      expect(pickEmbeddedAlt({ ImageDescription: 'from the file' }, 'written by an editor')).toBeUndefined();
    });

    it('treats a whitespace-only alt as empty, since that is not real alt text', () => {
      expect(pickEmbeddedAlt({ ImageDescription: 'from the file' }, '   ')).toBe('from the file');
    });
  });

  describe('declines rather than producing bad alt text', () => {
    it('ignores a caption long enough to be licensing prose', () => {
      // Truncating would read as broken mid-sentence; leaving it empty is the better failure.
      expect(pickEmbeddedAlt({ ImageDescription: 'x'.repeat(301) })).toBeUndefined();
    });

    it('accepts one right at the limit', () => {
      expect(pickEmbeddedAlt({ ImageDescription: 'x'.repeat(300) })).toHaveLength(300);
    });

    it.each([[undefined], [null], [42], [{}], [['a']], ['']])('ignores a non-string caption: %s', value => {
      expect(pickEmbeddedAlt({ ImageDescription: value })).toBeUndefined();
    });

    it('returns undefined when no caption tag is present at all', () => {
      expect(pickEmbeddedAlt({ Make: 'Camera Co', Model: 'X100' })).toBeUndefined();
    });
  });
});
