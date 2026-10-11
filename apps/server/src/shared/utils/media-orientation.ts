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

/**
 * Rotations that transpose the axes, in degrees. A quarter turn either way swaps width and height;
 * 0 and 180 leave them alone.
 */
const AXIS_SWAPPING_ROTATIONS: ReadonlySet<number> = new Set([90, 270]);

/**
 * Resolves the dimensions a video actually renders at, from its stored dimensions plus its
 * rotation.
 *
 * The video equivalent of {@link resolveOrientedDimensions}, and it exists for the same bug: a
 * portrait phone video stores landscape dimensions and a rotation of 90, so reading the dimensions
 * alone recorded it as landscape. The video branch of metadata extraction read `ImageWidth` and
 * `ImageHeight` and never looked at `Rotation` at all.
 *
 * Separate from the image function because the inputs differ in kind — EXIF orientation is an
 * enum of 1-8 describing flips and turns, while video rotation is a plain angle. Collapsing them
 * into one function would mean a parameter that means different things depending on the caller.
 *
 * Angles are normalised first, so `-90` and `270` are the same quarter turn, and anything that is
 * not a number is treated as no rotation rather than guessed at.
 * @param {number} [width] Stored width, as reported by exiftool
 * @param {number} [height] Stored height, as reported by exiftool
 * @param {unknown} [rotation] The raw `Rotation` tag, in degrees
 * @return {OrientedDimensions} the rendered dimensions and the shape they imply
 */
export function resolveRotatedDimensions(width?: number, height?: number, rotation?: unknown): OrientedDimensions {
  if (width === undefined || height === undefined) {
    return {};
  }

  let normalised: number | undefined;
  if (typeof rotation === 'number' && Number.isFinite(rotation)) {
    normalised = ((Math.round(rotation) % 360) + 360) % 360;
  }
  const swapped = normalised !== undefined && AXIS_SWAPPING_ROTATIONS.has(normalised);

  return resolveOrientedDimensions(swapped ? height : width, swapped ? width : height, undefined);
}
