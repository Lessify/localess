/**
 * Normalises a duration reported by exiftool into whole seconds.
 *
 * exiftool does not report a consistent type. A video usually yields a clock string
 * (`'00:01:05.161000000'` for WebM), while other containers yield a number, and some yield a
 * numeric string. The metadata extractor used to parse the clock form for videos but assign the
 * raw value straight through for images — so an animated GIF could end up with `duration` as a
 * **string** while a video beside it held a number.
 *
 * This is also applied when *reading*, not only when writing, because documents written before
 * that inconsistency was fixed may still hold a string. The public `AssetMetadata.duration` is
 * typed `number`, and normalising on read is what makes that true for legacy assets too, rather
 * than only for anything re-uploaded.
 * @param {unknown} raw The `Duration` tag as exiftool reported it
 * @return {number | undefined} whole seconds, or undefined if nothing sensible could be read
 */
export function normaliseDuration(raw: unknown): number | undefined {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? Math.round(raw) : undefined;
  }
  if (typeof raw !== 'string') {
    return undefined;
  }

  const parts = raw.split(':');
  if (parts.length === 3) {
    const [hours, minutes, seconds] = parts.map(part => Number.parseFloat(part));
    if ([hours, minutes, seconds].every(Number.isFinite)) {
      return Math.round(hours * 3600 + minutes * 60 + seconds);
    }
    return undefined;
  }

  // A plain numeric string, sometimes with a unit suffix exiftool appends (`'12.50 s'`).
  const seconds = Number.parseFloat(raw);
  return Number.isFinite(seconds) ? Math.round(seconds) : undefined;
}
