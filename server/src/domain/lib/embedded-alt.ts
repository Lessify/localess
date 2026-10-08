/**
 * Embedded caption tags, in the order they are preferred.
 *
 * XMP first because it is what modern tooling writes, then IPTC's `Caption-Abstract` which is the
 * press and stock-library convention, then the older EXIF `ImageDescription`. exiftool surfaces
 * all three under these names, so the caller can hand over the whole tag object.
 */
const CAPTION_TAGS = ['Description', 'Caption-Abstract', 'ImageDescription'] as const;

/**
 * Longest embedded caption that will be treated as alt text.
 *
 * A caption is not always alt text. Stock libraries sometimes embed a paragraph of licensing prose
 * in the same field, and putting that in an `alt` attribute is worse for a screen reader than
 * leaving it empty. Anything longer is left alone rather than truncated — a sentence cut off
 * mid-clause reads as broken rather than brief.
 */
const MAX_ALT_LENGTH = 300;

/**
 * Picks alt text from an image's embedded caption tags, when the asset has none of its own.
 *
 * Alt text is the field editors skip most often, and it is an accessibility requirement rather
 * than a nicety. A large share of uploads — anything from a stock library, a press wire, or a
 * photographer's export — already carries a caption, so seeding from it turns a blank field into a
 * reasonable default.
 *
 * **Never overwrites.** An `existingAlt` of any non-empty value wins, because this also runs when
 * metadata is regenerated for assets whose alt an editor has since written by hand. Deliberately
 * seeding on upload and on regeneration, but only into an empty field.
 * @param {Record<string, unknown>} tags Tags as exiftool reported them
 * @param {string} [existingAlt] The asset's current alt text, if it has any
 * @return {string | undefined} the caption to seed, or undefined to leave the field alone
 */
export function pickEmbeddedAlt(tags: Record<string, unknown>, existingAlt?: string): string | undefined {
  if (existingAlt !== undefined && existingAlt.trim() !== '') {
    return undefined;
  }

  for (const tag of CAPTION_TAGS) {
    const value = tags[tag];
    if (typeof value !== 'string') {
      continue;
    }
    const caption = value.trim();
    if (caption !== '' && caption.length <= MAX_ALT_LENGTH) {
      return caption;
    }
  }
  return undefined;
}
