/** How an image reads once its EXIF orientation has been applied. */
export type ImageOrientation = 'landscape' | 'portrait' | 'squarish';

/** Dimensions as the image actually renders, plus the shape that follows from them. */
export interface OrientedDimensions {
  width?: number;
  height?: number;
  orientation?: ImageOrientation;
}

/**
 * EXIF orientation values that rotate by 90 degrees, transposing the axes.
 *
 * 1-4 are the identity, a mirror, a 180 turn, or a flip — none of which change which axis is
 * which. 5-8 all involve a quarter turn, so a 400x200 file renders as 200x400.
 */
const AXIS_SWAPPING_ORIENTATIONS: ReadonlySet<number> = new Set([5, 6, 7, 8]);

/**
 * Resolves the dimensions an image actually renders at, from the raw stored dimensions plus its
 * EXIF orientation tag.
 *
 * **This exists because reading the two independently was a bug.** exiftool reports `ImageWidth`
 * and `ImageHeight` as *stored*, and reports `Orientation` separately — so a portrait phone photo
 * (400x200 stored, `Orientation: 6`) was recorded as 400x200 and labelled `landscape`. Both were
 * wrong, and both are load-bearing: `orientation` is shown in the asset UI, and the width/height
 * drive `canonicalTransformSize`, so an oversize request against such a photo failed to redirect.
 *
 * Verified against exiftool-vendored: a 400x200 JPEG tagged `Orientation: 6` reports
 * `ImageWidth: 400, ImageHeight: 200, Orientation: 6`.
 *
 * The tag is read defensively. exiftool can be configured to return orientation as a description
 * (`"Rotate 90 CW"`) rather than a number, and some files carry no tag at all, so anything that is
 * not a recognised numeric value is treated as "no rotation" — which leaves the previous behaviour
 * intact rather than guessing.
 * @param {number} [width] Stored width, as reported by exiftool
 * @param {number} [height] Stored height, as reported by exiftool
 * @param {unknown} [exifOrientation] The raw `Orientation` tag
 * @return {OrientedDimensions} the rendered dimensions and the shape they imply
 */
export function resolveOrientedDimensions(width?: number, height?: number, exifOrientation?: unknown): OrientedDimensions {
  if (width === undefined || height === undefined) {
    return {};
  }

  const swapped = typeof exifOrientation === 'number' && AXIS_SWAPPING_ORIENTATIONS.has(exifOrientation);
  const renderedWidth = swapped ? height : width;
  const renderedHeight = swapped ? width : height;

  let orientation: ImageOrientation;
  if (renderedWidth > renderedHeight) {
    orientation = 'landscape';
  } else if (renderedHeight > renderedWidth) {
    orientation = 'portrait';
  } else {
    orientation = 'squarish';
  }

  return { width: renderedWidth, height: renderedHeight, orientation };
}
